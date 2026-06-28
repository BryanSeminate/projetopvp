import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { applyStockMovement } from '../stock/stock.service.js';
import { getOpenRegister } from '../cash/cash.service.js';
import { useCreditForSale, releaseCredit } from '../credit/credit.service.js';
import { PERMISSIONS } from '../../shared/permissions.js';
import type { CreateSaleInput } from './sale.schema.js';

interface Actor {
  userId: string;
  companyId: string;
  permissions?: string[];
}

const r = (n: number) => Math.round(n * 100) / 100;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

const SALE_INCLUDE = {
  items: { include: { product: { select: { id: true, name: true, barcode: true } } } },
  payments: { include: { paymentMethod: { select: { id: true, name: true } } } },
  receivables: true,
  installments: { orderBy: { number: 'asc' as const } },
  customer: { select: { id: true, name: true } },
} satisfies Prisma.SaleInclude;

export class SaleService {
  async create(actor: Actor, input: CreateSaleInput) {
    const sale = await prisma.$transaction(async (tx) => {
      // 1. caixa aberto obrigatório
      const register = await getOpenRegister(tx, actor.companyId, actor.userId);
      if (!register) throw new BadRequestError('Não é possível vender sem caixa aberto');

      // 2. cliente (quando informado)
      if (input.customerId) {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, companyId: actor.companyId, deletedAt: null },
          select: { id: true, isActive: true },
        });
        if (!customer) throw new NotFoundError('Cliente não encontrado');
        if (!customer.isActive) throw new BadRequestError('Cliente inativo');
      }

      // 3. produtos
      const ids = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({
        where: { id: { in: ids }, companyId: actor.companyId, deletedAt: null },
      });
      const byId = new Map(products.map((p) => [p.id, p]));

      // 4. itens + subtotal
      let subtotal = 0;
      const itemsData = input.items.map((i) => {
        const product = byId.get(i.productId);
        if (!product) throw new BadRequestError(`Produto inválido: ${i.productId}`);
        if (!product.isActive) throw new BadRequestError(`Produto inativo: ${product.name}`);
        const unitPrice = i.unitPrice ?? Number(product.salePrice);
        const lineSubtotal = r(i.quantity * unitPrice - i.discount);
        if (lineSubtotal < 0) throw new BadRequestError('Subtotal do item não pode ser negativo');
        subtotal = r(subtotal + lineSubtotal);
        return {
          productId: product.id,
          quantity: i.quantity,
          unitPrice,
          discount: i.discount,
          subtotal: lineSubtotal,
        };
      });

      // 5. total
      const total = r(subtotal - input.discount);
      if (total < 0) throw new BadRequestError('Desconto maior que o subtotal');

      // 6. pagamentos
      const paidNow = r(input.payments.reduce((acc, p) => acc + p.amount, 0));
      let cashIn = 0;
      if (input.payments.length) {
        const methodIds = [...new Set(input.payments.map((p) => p.paymentMethodId))];
        const methods = await tx.paymentMethod.findMany({
          where: { id: { in: methodIds }, companyId: actor.companyId, isActive: true, deletedAt: null },
        });
        const mById = new Map(methods.map((m) => [m.id, m]));
        for (const p of input.payments) {
          const m = mById.get(p.paymentMethodId);
          if (!m) throw new BadRequestError('Forma de pagamento inválida');
          if (m.isCash) cashIn = r(cashIn + p.amount);
        }
      }

      // 7. regra por tipo
      const remainder = r(total - paidNow);
      if (input.type === 'CASH' && remainder > 0) {
        throw new BadRequestError('Pagamento insuficiente para venda à vista');
      }
      if (input.type === 'INSTALLMENT' && remainder <= 0) {
        throw new BadRequestError('Crediário exige valor a financiar (saldo após entrada)');
      }

      // 8. número sequencial por empresa
      const last = await tx.sale.findFirst({
        where: { companyId: actor.companyId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const number = (last?.number ?? 0) + 1;

      // 9. cria venda
      const created = await tx.sale.create({
        data: {
          companyId: actor.companyId,
          customerId: input.customerId ?? null,
          userId: actor.userId,
          cashRegisterId: register.id,
          number,
          type: input.type,
          status: 'COMPLETED',
          subtotal,
          discount: input.discount,
          total,
          items: { create: itemsData },
          payments: {
            create: input.payments.map((p) => ({
              paymentMethodId: p.paymentMethodId,
              amount: p.amount,
            })),
          },
        },
      });

      // 10. baixa estoque (atômica; falha = rollback de tudo)
      for (const i of input.items) {
        await applyStockMovement(tx, {
          companyId: actor.companyId,
          productId: i.productId,
          type: 'OUT',
          quantity: i.quantity,
          refType: 'SALE',
          refId: created.id,
          userId: actor.userId,
        });
      }

      // 11. dinheiro entra na gaveta
      if (cashIn > 0) {
        await tx.cashMovement.create({
          data: {
            companyId: actor.companyId,
            cashRegisterId: register.id,
            type: 'SALE',
            amount: cashIn,
            refId: created.id,
            userId: actor.userId,
            description: `Venda #${number}`,
          },
        });
      }

      // 12. a prazo → conta a receber do saldo
      if (input.type === 'TERM' && remainder > 0) {
        await tx.accountReceivable.create({
          data: {
            companyId: actor.companyId,
            customerId: input.customerId!,
            saleId: created.id,
            description: `Venda a prazo #${number}`,
            amount: remainder,
            dueDate: input.dueDate ?? addDays(new Date(), 30),
          },
        });
      }

      // 13. crediário → valida crédito + gera parcelas
      if (input.type === 'INSTALLMENT') {
        await useCreditForSale(tx, {
          companyId: actor.companyId,
          customerId: input.customerId!,
          amount: remainder,
          canOverride: (actor.permissions ?? []).includes(PERMISSIONS.CREDIT_OVERRIDE),
          override: input.creditOverride,
          overrideReason: input.overrideReason,
          userId: actor.userId,
          saleNumber: number,
        });

        const plan = input.installmentPlan!;
        const base = Math.floor((remainder / plan.count) * 100) / 100;
        const first = plan.firstDueDate ?? addDays(new Date(), plan.intervalDays);
        const installments = Array.from({ length: plan.count }, (_, idx) => {
          const isLast = idx === plan.count - 1;
          const amount = isLast ? r(remainder - base * (plan.count - 1)) : base;
          return {
            companyId: actor.companyId,
            customerId: input.customerId!,
            saleId: created.id,
            number: idx + 1,
            amount,
            dueDate: addDays(first, idx * plan.intervalDays),
          };
        });
        await tx.customerInstallment.createMany({ data: installments });
      }

      return tx.sale.findUniqueOrThrow({ where: { id: created.id }, include: SALE_INCLUDE });
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'Sale',
      entityId: sale.id,
      after: { number: sale.number, type: sale.type, total: sale.total },
    });
    return sale;
  }

  async cancel(actor: Actor, id: string, reason: string) {
    const sale = await prisma.$transaction(async (tx) => {
      const existing = await tx.sale.findFirst({
        where: { id, companyId: actor.companyId },
        include: { items: true, installments: true },
      });
      if (!existing) throw new NotFoundError('Venda não encontrada');
      if (existing.status !== 'COMPLETED') {
        throw new BadRequestError('Apenas vendas concluídas podem ser canceladas');
      }

      // reverte estoque
      for (const item of existing.items) {
        await applyStockMovement(tx, {
          companyId: actor.companyId,
          productId: item.productId,
          type: 'IN',
          quantity: Number(item.quantity),
          reason: `Cancelamento venda #${existing.number}`,
          refType: 'SALE_CANCEL',
          refId: existing.id,
          userId: actor.userId,
        });
      }

      // estorna dinheiro do caixa (só se ainda aberto)
      if (existing.cashRegisterId) {
        const reg = await tx.cashRegister.findUnique({ where: { id: existing.cashRegisterId } });
        if (reg?.status === 'OPEN') {
          const cashMovs = await tx.cashMovement.findMany({
            where: { cashRegisterId: reg.id, type: 'SALE', refId: existing.id },
          });
          const cashTotal = cashMovs.reduce((acc, m) => acc + Number(m.amount), 0);
          if (cashTotal > 0) {
            await tx.cashMovement.create({
              data: {
                companyId: actor.companyId,
                cashRegisterId: reg.id,
                type: 'SALE',
                amount: -cashTotal, // estorno
                refId: existing.id,
                userId: actor.userId,
                description: `Estorno venda #${existing.number}`,
              },
            });
          }
        }
      }

      // cancela financeiro vinculado
      await tx.accountReceivable.updateMany({
        where: { saleId: existing.id, status: { notIn: ['PAID', 'CANCELED'] } },
        data: { status: 'CANCELED' },
      });
      await tx.customerInstallment.updateMany({
        where: { saleId: existing.id, status: { in: ['OPEN', 'OVERDUE'] } },
        data: { status: 'CANCELED' },
      });

      // libera crédito usado (saldo não pago das parcelas canceladas)
      if (existing.type === 'INSTALLMENT' && existing.customerId) {
        const released = existing.installments
          .filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE')
          .reduce((acc, i) => acc + (Number(i.amount) - Number(i.paidAmount)), 0);
        if (released > 0) {
          await releaseCredit(tx, {
            companyId: actor.companyId,
            customerId: existing.customerId,
            amount: released,
            userId: actor.userId,
            description: `Cancelamento venda #${existing.number}`,
          });
        }
      }

      return tx.sale.update({
        where: { id: existing.id },
        data: { status: 'CANCELED', canceledAt: new Date(), cancelReason: reason },
        include: SALE_INCLUDE,
      });
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CANCEL',
      entity: 'Sale',
      entityId: sale.id,
      after: { number: sale.number, reason },
    });
    return sale;
  }

  async getById(actor: Actor, id: string) {
    const sale = await prisma.sale.findFirst({
      where: { id, companyId: actor.companyId },
      include: SALE_INCLUDE,
    });
    if (!sale) throw new NotFoundError('Venda não encontrada');
    return sale;
  }

  async list(
    actor: Actor,
    params: {
      status?: 'COMPLETED' | 'CANCELED';
      type?: 'CASH' | 'TERM' | 'INSTALLMENT';
      customerId?: string;
      page: number;
      pageSize: number;
    },
  ) {
    const where = {
      companyId: actor.companyId,
      ...(params.status ? { status: params.status } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.sale.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  // ----- payment methods -----
  async listPaymentMethods(actor: Actor) {
    return prisma.paymentMethod.findMany({
      where: { companyId: actor.companyId, isActive: true, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }
}

import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { applyStockMovement } from '../stock/stock.service.js';
import type { CreatePurchaseInput } from './purchase.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

const r = (n: number) => Math.round(n * 100) / 100;

const DETAIL_INCLUDE = {
  items: { include: { product: { select: { id: true, name: true, barcode: true } } } },
  supplier: { select: { id: true, name: true } },
};

export class PurchaseService {
  /** Records a purchase, increases stock (movement IN) and updates product cost. Optionally opens a payable. */
  async create(actor: Actor, input: CreatePurchaseInput) {
    const purchase = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findFirst({
        where: { id: input.supplierId, companyId: actor.companyId, deletedAt: null },
        select: { id: true, name: true },
      });
      if (!supplier) throw new NotFoundError('Fornecedor não encontrado');

      const ids = input.items.map((i) => i.productId);
      const products = await tx.product.findMany({ where: { id: { in: ids }, companyId: actor.companyId, deletedAt: null } });
      const byId = new Map(products.map((p) => [p.id, p]));

      let total = 0;
      const itemsData = input.items.map((i) => {
        if (!byId.has(i.productId)) throw new BadRequestError(`Produto inválido: ${i.productId}`);
        const subtotal = r(i.quantity * i.unitCost);
        total = r(total + subtotal);
        return { productId: i.productId, quantity: i.quantity, unitCost: i.unitCost, subtotal };
      });

      const created = await tx.purchase.create({
        data: {
          companyId: actor.companyId,
          supplierId: input.supplierId,
          total,
          notes: input.notes ?? null,
          items: { create: itemsData },
        },
      });

      // entrada de estoque + atualiza custo do produto
      for (const i of input.items) {
        await applyStockMovement(tx, {
          companyId: actor.companyId,
          productId: i.productId,
          type: 'IN',
          quantity: i.quantity,
          refType: 'PURCHASE',
          refId: created.id,
          userId: actor.userId,
        });
        await tx.product.update({ where: { id: i.productId }, data: { costPrice: i.unitCost } });
      }

      // conta a pagar (opcional)
      if (input.generatePayable) {
        await tx.accountPayable.create({
          data: {
            companyId: actor.companyId,
            supplierId: input.supplierId,
            description: `Compra ${supplier.name}`,
            amount: total,
            dueDate: input.dueDate!,
          },
        });
      }

      return tx.purchase.findUniqueOrThrow({ where: { id: created.id }, include: DETAIL_INCLUDE });
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'Purchase',
      entityId: purchase.id,
      after: { total: purchase.total, items: purchase.items.length },
    });
    return purchase;
  }

  async list(actor: Actor, params: { supplierId?: string; page: number; pageSize: number }) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
      ...(params.supplierId ? { supplierId: params.supplierId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.purchase.findMany({
        where,
        include: { supplier: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.purchase.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const purchase = await prisma.purchase.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null }, include: DETAIL_INCLUDE });
    if (!purchase) throw new NotFoundError('Compra não encontrada');
    return purchase;
  }
}

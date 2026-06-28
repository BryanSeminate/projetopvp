import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateRenegotiationInput } from './renegotiation.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

const r = (n: number) => Math.round(n * 100) / 100;
const addDays = (d: Date, days: number) => new Date(d.getTime() + days * 86_400_000);

const DETAIL_INCLUDE = {
  items: { include: { installment: { select: { id: true, number: true } } } },
  newInstallments: { orderBy: { number: 'asc' as const } },
  customer: { select: { id: true, name: true } },
};

export class RenegotiationService {
  /**
   * Creates an agreement: marks the selected overdue/open installments as
   * RENEGOTIATED and generates new installments for (originalTotal - discount +
   * interest). Adjusts the customer's used credit by the net delta. Old
   * installments leave the delinquency panel and stop being collectable.
   */
  async create(actor: Actor, input: CreateRenegotiationInput) {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({
        where: { id: input.customerId, companyId: actor.companyId, deletedAt: null },
        select: { id: true },
      });
      if (!customer) throw new NotFoundError('Cliente não encontrado');

      const olds = await tx.customerInstallment.findMany({
        where: {
          id: { in: input.installmentIds },
          companyId: actor.companyId,
          customerId: input.customerId,
        },
      });
      if (olds.length !== input.installmentIds.length) {
        throw new BadRequestError('Parcelas inválidas para este cliente');
      }
      const settleable = olds.filter((i) => i.status === 'OPEN' || i.status === 'OVERDUE');
      if (settleable.length === 0) {
        throw new BadRequestError('Nenhuma parcela em aberto para renegociar');
      }

      const originalTotal = r(settleable.reduce((acc, i) => acc + (Number(i.amount) - Number(i.paidAmount)), 0));
      const newTotal = r(originalTotal - input.discount + input.interest);
      if (newTotal <= 0) throw new BadRequestError('Total do acordo deve ser maior que zero');

      // create the agreement
      const reneg = await tx.debtRenegotiation.create({
        data: {
          companyId: actor.companyId,
          customerId: input.customerId,
          userId: actor.userId,
          originalTotal,
          newTotal,
          discount: input.discount,
          interest: input.interest,
          installments: input.count,
          notes: input.notes ?? null,
        },
      });

      // link + retire old installments
      for (const old of settleable) {
        await tx.debtRenegotiationItem.create({
          data: {
            renegotiationId: reneg.id,
            installmentId: old.id,
            amount: r(Number(old.amount) - Number(old.paidAmount)),
          },
        });
      }
      await tx.customerInstallment.updateMany({
        where: { id: { in: settleable.map((i) => i.id) } },
        data: { status: 'RENEGOTIATED' },
      });

      // new installments
      const base = Math.floor((newTotal / input.count) * 100) / 100;
      const first = input.firstDueDate ?? addDays(new Date(), input.intervalDays);
      for (let idx = 0; idx < input.count; idx++) {
        const isLast = idx === input.count - 1;
        const amount = isLast ? r(newTotal - base * (input.count - 1)) : base;
        await tx.customerInstallment.create({
          data: {
            companyId: actor.companyId,
            customerId: input.customerId,
            renegotiationId: reneg.id,
            number: idx + 1,
            amount,
            dueDate: addDays(first, idx * input.intervalDays),
          },
        });
      }

      // adjust used credit by the net delta (newTotal replaces originalTotal)
      const credit = await tx.customerCredit.findUnique({ where: { customerId: input.customerId } });
      if (credit) {
        const delta = r(newTotal - originalTotal);
        const newUsed = Math.max(0, r(Number(credit.usedCredit) + delta));
        await tx.customerCredit.update({ where: { id: credit.id }, data: { usedCredit: newUsed } });
        await tx.customerCreditHistory.create({
          data: {
            companyId: actor.companyId,
            creditId: credit.id,
            userId: actor.userId,
            type: 'RENEGOTIATION',
            amount: delta,
            description: `Acordo: ${settleable.length} parcela(s) → ${input.count} nova(s)`,
          },
        });
      }

      return tx.debtRenegotiation.findUniqueOrThrow({ where: { id: reneg.id }, include: DETAIL_INCLUDE });
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'DebtRenegotiation',
      entityId: result.id,
      after: { originalTotal: result.originalTotal, newTotal: result.newTotal, installments: result.installments },
    });
    return result;
  }

  async list(actor: Actor, params: { customerId?: string; page: number; pageSize: number }) {
    const where = {
      companyId: actor.companyId,
      ...(params.customerId ? { customerId: params.customerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.debtRenegotiation.findMany({
        where,
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.debtRenegotiation.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const reneg = await prisma.debtRenegotiation.findFirst({
      where: { id, companyId: actor.companyId },
      include: DETAIL_INCLUDE,
    });
    if (!reneg) throw new NotFoundError('Renegociação não encontrada');
    return reneg;
  }
}

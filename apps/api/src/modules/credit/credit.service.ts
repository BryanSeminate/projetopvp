import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../shared/errors/AppError.js';

interface Actor {
  userId: string;
  companyId: string;
}

type Client = Prisma.TransactionClient | typeof prisma;
const r = (n: number) => Math.round(n * 100) / 100;

/** Ensures a credit record exists for the customer (lazy create, limit 0). */
export async function getOrCreateCredit(client: Client, companyId: string, customerId: string) {
  const existing = await client.customerCredit.findUnique({ where: { customerId } });
  if (existing) return existing;
  return client.customerCredit.create({
    data: { companyId, customerId, creditLimit: 0, usedCredit: 0 },
  });
}

/** True if the customer has any overdue installment (OVERDUE or OPEN past due). */
export async function isDelinquent(client: Client, companyId: string, customerId: string) {
  const overdue = await client.customerInstallment.findFirst({
    where: {
      companyId,
      customerId,
      OR: [{ status: 'OVERDUE' }, { status: 'OPEN', dueDate: { lt: new Date() } }],
    },
    select: { id: true },
  });
  return Boolean(overdue);
}

/**
 * Validates credit rules for a crediário sale and increments usedCredit.
 * MUST run inside the sale transaction. Throws unless allowed.
 *
 * - BLOCKED status: never allowed (not overridable).
 * - Delinquent OR over available limit: needs manager override
 *   (permission credit.override + justification).
 */
export async function useCreditForSale(
  tx: Prisma.TransactionClient,
  params: {
    companyId: string;
    customerId: string;
    amount: number;
    canOverride: boolean; // user has credit.override permission
    override: boolean; // user requested override
    overrideReason?: string;
    userId: string;
    saleNumber: number;
  },
) {
  const credit = await getOrCreateCredit(tx, params.companyId, params.customerId);

  if (credit.status === 'BLOCKED') {
    throw new ForbiddenError(`Crédito bloqueado: ${credit.blockReason ?? 'sem motivo'}`);
  }

  const delinquent = await isDelinquent(tx, params.companyId, params.customerId);
  const available = r(Number(credit.creditLimit) - Number(credit.usedCredit));
  const overLimit = params.amount > available;

  const needsOverride = delinquent || overLimit;
  if (needsOverride) {
    const reasons = [delinquent ? 'cliente inadimplente' : null, overLimit ? 'acima do limite' : null]
      .filter(Boolean)
      .join(' + ');
    if (!params.override) {
      throw new BadRequestError(`Venda no crediário bloqueada (${reasons})`);
    }
    if (!params.canOverride) {
      throw new ForbiddenError('Sem permissão para liberar venda (credit.override)');
    }
    if (!params.overrideReason) {
      throw new BadRequestError('Justificativa obrigatória para liberação');
    }
  }

  // increment used credit
  await tx.customerCredit.update({
    where: { id: credit.id },
    data: { usedCredit: r(Number(credit.usedCredit) + params.amount) },
  });

  // history: USE (+ OVERRIDE when applicable)
  await tx.customerCreditHistory.create({
    data: {
      companyId: params.companyId,
      creditId: credit.id,
      userId: params.userId,
      type: 'USE',
      amount: params.amount,
      description: `Venda crediário #${params.saleNumber}`,
    },
  });
  if (needsOverride) {
    await tx.customerCreditHistory.create({
      data: {
        companyId: params.companyId,
        creditId: credit.id,
        userId: params.userId,
        type: 'OVERRIDE',
        amount: params.amount,
        description: `Liberação manual venda #${params.saleNumber}: ${params.overrideReason}`,
      },
    });
  }

  return { overridden: needsOverride };
}

/** Releases used credit (payment of installment, or sale cancellation). */
export async function releaseCredit(
  tx: Prisma.TransactionClient,
  params: { companyId: string; customerId: string; amount: number; userId?: string; description: string },
) {
  const credit = await tx.customerCredit.findUnique({ where: { customerId: params.customerId } });
  if (!credit) return;
  const newUsed = Math.max(0, r(Number(credit.usedCredit) - params.amount));
  await tx.customerCredit.update({ where: { id: credit.id }, data: { usedCredit: newUsed } });
  await tx.customerCreditHistory.create({
    data: {
      companyId: params.companyId,
      creditId: credit.id,
      userId: params.userId ?? null,
      type: 'RELEASE',
      amount: params.amount,
      description: params.description,
    },
  });
}

export class CreditService {
  private async assertCustomer(actor: Actor, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, companyId: actor.companyId, deletedAt: null },
      select: { id: true, name: true, isActive: true },
    });
    if (!customer) throw new NotFoundError('Cliente não encontrado');
    return customer;
  }

  async get(actor: Actor, customerId: string) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    const delinquent = await isDelinquent(prisma, actor.companyId, customerId);
    const available = r(Number(credit.creditLimit) - Number(credit.usedCredit));
    return {
      ...credit,
      available,
      delinquent,
    };
  }

  async setLimit(actor: Actor, customerId: string, creditLimit: number) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    const updated = await prisma.customerCredit.update({
      where: { id: credit.id },
      data: { creditLimit },
    });
    await prisma.customerCreditHistory.create({
      data: {
        companyId: actor.companyId,
        creditId: credit.id,
        userId: actor.userId,
        type: 'LIMIT_CHANGE',
        amount: creditLimit,
        description: `Limite alterado de ${credit.creditLimit} para ${creditLimit}`,
      },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'CustomerCredit',
      entityId: credit.id,
      before: { creditLimit: credit.creditLimit },
      after: { creditLimit },
    });
    return updated;
  }

  async block(actor: Actor, customerId: string, reason: string) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    const updated = await prisma.customerCredit.update({
      where: { id: credit.id },
      data: { status: 'BLOCKED', blockReason: reason },
    });
    await prisma.customerCreditHistory.create({
      data: { companyId: actor.companyId, creditId: credit.id, userId: actor.userId, type: 'BLOCK', description: reason },
    });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'BLOCK', entity: 'CustomerCredit', entityId: credit.id, after: { reason } });
    return updated;
  }

  async unblock(actor: Actor, customerId: string) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    const updated = await prisma.customerCredit.update({
      where: { id: credit.id },
      data: { status: 'ACTIVE', blockReason: null },
    });
    await prisma.customerCreditHistory.create({
      data: { companyId: actor.companyId, creditId: credit.id, userId: actor.userId, type: 'UNBLOCK' },
    });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'UNBLOCK', entity: 'CustomerCredit', entityId: credit.id });
    return updated;
  }

  async setAutoCollection(actor: Actor, customerId: string, autoCollection: boolean) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    return prisma.customerCredit.update({ where: { id: credit.id }, data: { autoCollection } });
  }

  async history(actor: Actor, customerId: string) {
    await this.assertCustomer(actor, customerId);
    const credit = await getOrCreateCredit(prisma, actor.companyId, customerId);
    return prisma.customerCreditHistory.findMany({
      where: { creditId: credit.id },
      orderBy: { createdAt: 'desc' },
    });
  }
}

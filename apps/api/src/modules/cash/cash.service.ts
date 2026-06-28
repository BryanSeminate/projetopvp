import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CloseCashInput, MovementInput, OpenCashInput } from './cash.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface MovementLike {
  type: string;
  amount: Prisma.Decimal | number;
}

/** Expected cash = opening + supplies + cash sales - withdrawals. */
export function computeExpected(movements: MovementLike[]): number {
  return movements.reduce((acc, m) => {
    const v = Number(m.amount);
    if (m.type === 'WITHDRAWAL') return acc - v;
    if (m.type === 'CLOSING') return acc; // close record, not part of balance
    return acc + v; // OPENING, SUPPLY, SALE
  }, 0);
}

/** Returns the user's currently OPEN register in the company, or null. */
export async function getOpenRegister(
  client: Prisma.TransactionClient | typeof prisma,
  companyId: string,
  userId: string,
) {
  return client.cashRegister.findFirst({
    where: { companyId, userId, status: 'OPEN' },
  });
}

/**
 * Adds a SALE movement to an open register. Reused by the PDV inside its sale
 * transaction. Throws if no register is open.
 */
export async function registerSaleMovement(
  tx: Prisma.TransactionClient,
  params: { companyId: string; userId: string; amount: number; refId: string },
) {
  const register = await getOpenRegister(tx, params.companyId, params.userId);
  if (!register) throw new BadRequestError('Nenhum caixa aberto para registrar a venda');
  return tx.cashMovement.create({
    data: {
      companyId: params.companyId,
      cashRegisterId: register.id,
      type: 'SALE',
      amount: params.amount,
      refId: params.refId,
      userId: params.userId,
    },
  });
}

export class CashService {
  async open(actor: Actor, input: OpenCashInput) {
    const existing = await getOpenRegister(prisma, actor.companyId, actor.userId);
    if (existing) throw new ConflictError('Já existe um caixa aberto para este usuário');

    const register = await prisma.$transaction(async (tx) => {
      const reg = await tx.cashRegister.create({
        data: {
          companyId: actor.companyId,
          userId: actor.userId,
          openingAmount: input.openingAmount,
        },
      });
      await tx.cashMovement.create({
        data: {
          companyId: actor.companyId,
          cashRegisterId: reg.id,
          type: 'OPENING',
          amount: input.openingAmount,
          userId: actor.userId,
          description: 'Abertura de caixa',
        },
      });
      return reg;
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CASH_OPEN',
      entity: 'CashRegister',
      entityId: register.id,
      after: register,
    });
    return register;
  }

  /** Current open register + its movements + computed expected balance. */
  async current(actor: Actor) {
    const register = await prisma.cashRegister.findFirst({
      where: { companyId: actor.companyId, userId: actor.userId, status: 'OPEN' },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    if (!register) throw new NotFoundError('Nenhum caixa aberto');
    return { ...register, expectedAmount: computeExpected(register.movements) };
  }

  private async requireOpen(actor: Actor) {
    const register = await getOpenRegister(prisma, actor.companyId, actor.userId);
    if (!register) throw new BadRequestError('Nenhum caixa aberto');
    return register;
  }

  /** Sangria — removes cash. Cannot make the drawer negative. */
  async withdrawal(actor: Actor, input: MovementInput) {
    const register = await this.requireOpen(actor);
    const movements = await prisma.cashMovement.findMany({ where: { cashRegisterId: register.id } });
    const balance = computeExpected(movements);
    if (input.amount > balance) throw new BadRequestError('Sangria maior que o saldo do caixa');

    const mov = await prisma.cashMovement.create({
      data: {
        companyId: actor.companyId,
        cashRegisterId: register.id,
        type: 'WITHDRAWAL',
        amount: input.amount,
        description: input.description ?? 'Sangria',
        userId: actor.userId,
      },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CASH_WITHDRAWAL',
      entity: 'CashMovement',
      entityId: mov.id,
      after: mov,
    });
    return mov;
  }

  /** Suprimento — adds cash. */
  async supply(actor: Actor, input: MovementInput) {
    const register = await this.requireOpen(actor);
    const mov = await prisma.cashMovement.create({
      data: {
        companyId: actor.companyId,
        cashRegisterId: register.id,
        type: 'SUPPLY',
        amount: input.amount,
        description: input.description ?? 'Suprimento',
        userId: actor.userId,
      },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CASH_SUPPLY',
      entity: 'CashMovement',
      entityId: mov.id,
      after: mov,
    });
    return mov;
  }

  /** Close — counts drawer, computes expected + difference (conferência). */
  async close(actor: Actor, input: CloseCashInput) {
    const register = await this.requireOpen(actor);

    const result = await prisma.$transaction(async (tx) => {
      const movements = await tx.cashMovement.findMany({ where: { cashRegisterId: register.id } });
      const expected = computeExpected(movements);
      const difference = input.closingAmount - expected;

      await tx.cashMovement.create({
        data: {
          companyId: actor.companyId,
          cashRegisterId: register.id,
          type: 'CLOSING',
          amount: input.closingAmount,
          description: input.notes ?? 'Fechamento de caixa',
          userId: actor.userId,
        },
      });

      return tx.cashRegister.update({
        where: { id: register.id },
        data: {
          status: 'CLOSED',
          closingAmount: input.closingAmount,
          expectedAmount: expected,
          difference,
          closedAt: new Date(),
        },
      });
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CASH_CLOSE',
      entity: 'CashRegister',
      entityId: register.id,
      after: result,
    });
    return result;
  }

  async list(
    actor: Actor,
    params: { status?: 'OPEN' | 'CLOSED'; page: number; pageSize: number },
  ) {
    const where = {
      companyId: actor.companyId,
      ...(params.status ? { status: params.status } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.cashRegister.findMany({
        where,
        orderBy: { openedAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.cashRegister.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const register = await prisma.cashRegister.findFirst({
      where: { id, companyId: actor.companyId },
      include: { movements: { orderBy: { createdAt: 'asc' } } },
    });
    if (!register) throw new NotFoundError('Caixa não encontrado');
    return register;
  }
}

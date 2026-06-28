import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { BadRequestError, NotFoundError } from '../../shared/errors/AppError.js';
import { releaseCredit } from '../credit/credit.service.js';
import type {
  CreatePayableInput,
  CreateReceivableInput,
  SettleInput,
} from './finance.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface ListParams {
  status?: string;
  customerId?: string;
  overdue?: 'true';
  page: number;
  pageSize: number;
}

const r = (n: number) => Math.round(n * 100) / 100;

/** Computes new paid total + status given a settlement. Shared by all 3 ledgers. */
function settleMath(current: { amount: number; paidAmount: number }, input: SettleInput) {
  const newPaid = r(current.paidAmount + input.amount);
  if (newPaid > current.amount + 0.001) {
    throw new BadRequestError('Valor da baixa excede o saldo em aberto');
  }
  const fullyPaid = newPaid >= current.amount - 0.001;
  return { newPaid, fullyPaid };
}

export class FinanceService {
  // ============================ PAYABLES ============================
  async listPayables(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.overdue ? { dueDate: { lt: new Date() }, status: { in: ['OPEN', 'PARTIAL'] as never } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.accountPayable.findMany({ where, orderBy: { dueDate: 'asc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.accountPayable.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getPayable(actor: Actor, id: string) {
    const row = await prisma.accountPayable.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null } });
    if (!row) throw new NotFoundError('Conta a pagar não encontrada');
    return row;
  }

  async createPayable(actor: Actor, data: CreatePayableInput) {
    const row = await prisma.accountPayable.create({ data: { ...data, companyId: actor.companyId } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'CREATE', entity: 'AccountPayable', entityId: row.id, after: row });
    return row;
  }

  async updatePayable(actor: Actor, id: string, data: Partial<CreatePayableInput>) {
    const before = await this.getPayable(actor, id);
    if (before.status === 'PAID' || before.status === 'CANCELED') {
      throw new BadRequestError('Conta paga/cancelada não pode ser editada');
    }
    const row = await prisma.accountPayable.update({ where: { id }, data });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'UPDATE', entity: 'AccountPayable', entityId: id, before, after: row });
    return row;
  }

  async payPayable(actor: Actor, id: string, input: SettleInput) {
    const acc = await this.getPayable(actor, id);
    if (acc.status === 'PAID' || acc.status === 'CANCELED') throw new BadRequestError('Conta já quitada ou cancelada');
    const { newPaid, fullyPaid } = settleMath({ amount: Number(acc.amount), paidAmount: Number(acc.paidAmount) }, input);

    const row = await prisma.accountPayable.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        interest: r(Number(acc.interest) + input.interest),
        fine: r(Number(acc.fine) + input.fine),
        discount: r(Number(acc.discount) + input.discount),
        status: fullyPaid ? 'PAID' : 'PARTIAL',
        paidAt: fullyPaid ? input.paidAt ?? new Date() : null,
      },
    });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'SETTLE', entity: 'AccountPayable', entityId: id, after: { paid: input.amount, status: row.status } });
    return row;
  }

  async cancelPayable(actor: Actor, id: string) {
    const before = await this.getPayable(actor, id);
    const row = await prisma.accountPayable.update({ where: { id }, data: { status: 'CANCELED', deletedAt: new Date() } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'DELETE', entity: 'AccountPayable', entityId: id, before });
    return row;
  }

  // ============================ RECEIVABLES ============================
  async listReceivables(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.overdue ? { dueDate: { lt: new Date() }, status: { in: ['OPEN', 'PARTIAL'] as never } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.accountReceivable.findMany({ where, include: { customer: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.accountReceivable.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getReceivable(actor: Actor, id: string) {
    const row = await prisma.accountReceivable.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null } });
    if (!row) throw new NotFoundError('Conta a receber não encontrada');
    return row;
  }

  async createReceivable(actor: Actor, data: CreateReceivableInput) {
    const row = await prisma.accountReceivable.create({ data: { ...data, companyId: actor.companyId } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'CREATE', entity: 'AccountReceivable', entityId: row.id, after: row });
    return row;
  }

  async receiveReceivable(actor: Actor, id: string, input: SettleInput) {
    const acc = await this.getReceivable(actor, id);
    if (acc.status === 'PAID' || acc.status === 'CANCELED') throw new BadRequestError('Conta já quitada ou cancelada');
    const { newPaid, fullyPaid } = settleMath({ amount: Number(acc.amount), paidAmount: Number(acc.paidAmount) }, input);

    const row = await prisma.accountReceivable.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        interest: r(Number(acc.interest) + input.interest),
        fine: r(Number(acc.fine) + input.fine),
        discount: r(Number(acc.discount) + input.discount),
        status: fullyPaid ? 'PAID' : 'PARTIAL',
        paidAt: fullyPaid ? input.paidAt ?? new Date() : null,
      },
    });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'SETTLE', entity: 'AccountReceivable', entityId: id, after: { received: input.amount, status: row.status } });
    return row;
  }

  // ============================ INSTALLMENTS (crediário) ============================
  async listInstallments(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.customerId ? { customerId: params.customerId } : {}),
      ...(params.overdue ? { dueDate: { lt: new Date() }, status: { in: ['OPEN', 'OVERDUE'] as never } } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerInstallment.findMany({ where, include: { customer: { select: { id: true, name: true } } }, orderBy: { dueDate: 'asc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.customerInstallment.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  /** Pays an installment and RELEASES the customer's used credit by the principal paid. */
  async payInstallment(actor: Actor, id: string, input: SettleInput) {
    const result = await prisma.$transaction(async (tx) => {
      const inst = await tx.customerInstallment.findFirst({ where: { id, companyId: actor.companyId } });
      if (!inst) throw new NotFoundError('Parcela não encontrada');
      if (inst.status === 'PAID' || inst.status === 'CANCELED' || inst.status === 'RENEGOTIATED') {
        throw new BadRequestError('Parcela não está em aberto');
      }
      const { newPaid, fullyPaid } = settleMath({ amount: Number(inst.amount), paidAmount: Number(inst.paidAmount) }, input);

      const updated = await tx.customerInstallment.update({
        where: { id },
        data: {
          paidAmount: newPaid,
          interest: r(Number(inst.interest) + input.interest),
          fine: r(Number(inst.fine) + input.fine),
          status: fullyPaid ? 'PAID' : inst.status,
          paidAt: fullyPaid ? input.paidAt ?? new Date() : null,
        },
      });

      // pagamento de parcela libera limite (principal pago)
      await releaseCredit(tx, {
        companyId: actor.companyId,
        customerId: inst.customerId,
        amount: input.amount,
        userId: actor.userId,
        description: `Pagamento parcela #${inst.number}`,
      });

      return updated;
    });

    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'SETTLE', entity: 'CustomerInstallment', entityId: id, after: { paid: input.amount, status: result.status } });
    return result;
  }
}

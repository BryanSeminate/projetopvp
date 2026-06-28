import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

interface Actor {
  userId: string;
  companyId: string;
}

const daysBetween = (from: Date, to = new Date()) =>
  Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / 86_400_000));

// SQL fragment: open/overdue installment past the grace cutoff
const overdueFrag = (cutoff: Date) =>
  Prisma.sql`(i.status IN ('OVERDUE', 'OPEN') AND i."dueDate" < ${cutoff})`;

async function graceCutoff(companyId: string): Promise<Date> {
  const s = await prisma.systemSettings.findUnique({ where: { companyId }, select: { daysToOverdue: true } });
  return new Date(Date.now() - (s?.daysToOverdue ?? 0) * 86_400_000);
}

export class DelinquencyService {
  /** Live panel summary: how many customers owe, how many installments, total owed. */
  async panel(actor: Actor) {
    const cutoff = await graceCutoff(actor.companyId);
    const rows = await prisma.$queryRaw<
      Array<{ customers: bigint; installments: bigint; total: string | null }>
    >(Prisma.sql`
      SELECT
        COUNT(DISTINCT i."customerId") AS customers,
        COUNT(*)                       AS installments,
        COALESCE(SUM(i.amount - i."paidAmount"), 0) AS total
      FROM "CustomerInstallment" i
      WHERE i."companyId" = ${actor.companyId} AND ${overdueFrag(cutoff)}
    `);
    const blocked = await prisma.customerCredit.count({
      where: { companyId: actor.companyId, status: 'BLOCKED' },
    });
    const r = rows[0];
    return {
      delinquentCustomers: Number(r?.customers ?? 0),
      overdueInstallments: Number(r?.installments ?? 0),
      totalOverdue: Number(r?.total ?? 0),
      blockedCustomers: blocked,
    };
  }

  /** Debtors ranked by days late or amount owed. */
  async customers(actor: Actor, params: { sort: 'days' | 'value'; limit: number }) {
    const cutoff = await graceCutoff(actor.companyId);
    const orderBy =
      params.sort === 'value' ? Prisma.sql`total_owed DESC` : Prisma.sql`oldest_due ASC`;

    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        name: string;
        phone: string | null;
        overdue_count: bigint;
        total_owed: string;
        oldest_due: Date;
        credit_status: string | null;
      }>
    >(Prisma.sql`
      SELECT
        c.id, c.name, c.phone,
        COUNT(i.id)                     AS overdue_count,
        SUM(i.amount - i."paidAmount")  AS total_owed,
        MIN(i."dueDate")                AS oldest_due,
        cc.status                       AS credit_status
      FROM "CustomerInstallment" i
      JOIN "Customer" c        ON c.id = i."customerId"
      LEFT JOIN "CustomerCredit" cc ON cc."customerId" = c.id
      WHERE i."companyId" = ${actor.companyId} AND ${overdueFrag(cutoff)}
      GROUP BY c.id, c.name, c.phone, cc.status
      ORDER BY ${orderBy}
      LIMIT ${params.limit}
    `);

    return rows.map((r) => ({
      customerId: r.id,
      name: r.name,
      phone: r.phone,
      overdueCount: Number(r.overdue_count),
      totalOwed: Number(r.total_owed),
      oldestDueDate: r.oldest_due,
      daysLate: daysBetween(r.oldest_due),
      blocked: r.credit_status === 'BLOCKED',
    }));
  }

  /** Flat list of overdue installments (optionally per customer). */
  async overdueInstallments(
    actor: Actor,
    params: { customerId?: string; page: number; pageSize: number },
  ) {
    const cutoff = await graceCutoff(actor.companyId);
    const where = {
      companyId: actor.companyId,
      status: { in: ['OVERDUE' as const, 'OPEN' as const] },
      dueDate: { lt: cutoff },
      ...(params.customerId ? { customerId: params.customerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.customerInstallment.findMany({
        where,
        include: { customer: { select: { id: true, name: true, phone: true } } },
        orderBy: { dueDate: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.customerInstallment.count({ where }),
    ]);
    return {
      items: items.map((i) => ({
        ...i,
        daysLate: daysBetween(i.dueDate),
        balance: Number(i.amount) - Number(i.paidAmount),
      })),
      total,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  /** Customers whose credit is blocked. */
  async blocked(actor: Actor) {
    const rows = await prisma.customerCredit.findMany({
      where: { companyId: actor.companyId, status: 'BLOCKED' },
      include: { customer: { select: { id: true, name: true, phone: true } } },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((r) => ({
      customerId: r.customerId,
      name: r.customer.name,
      phone: r.customer.phone,
      blockReason: r.blockReason,
      usedCredit: Number(r.usedCredit),
      creditLimit: Number(r.creditLimit),
    }));
  }
}

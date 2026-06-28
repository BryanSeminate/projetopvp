import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface Period {
  from?: Date;
  to?: Date;
}

function dateFilter(p: Period) {
  if (!p.from && !p.to) return {};
  return { createdAt: { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lte: p.to } : {}) } };
}

export class ReportService {
  /** Sales summary: total, count, breakdown by type, top products. */
  async sales(actor: Actor, period: Period) {
    const where = { companyId: actor.companyId, status: 'COMPLETED' as const, ...dateFilter(period) };

    const [agg, byTypeRaw] = await Promise.all([
      prisma.sale.aggregate({ where, _sum: { total: true }, _count: true }),
      prisma.sale.groupBy({ by: ['type'], where, _sum: { total: true }, _count: true }),
    ]);

    const fromCond = period.from ? Prisma.sql`AND s."createdAt" >= ${period.from}` : Prisma.empty;
    const toCond = period.to ? Prisma.sql`AND s."createdAt" <= ${period.to}` : Prisma.empty;
    const topProducts = await prisma.$queryRaw<Array<{ productId: string; name: string; qty: string; revenue: string }>>(Prisma.sql`
      SELECT si."productId", p.name, SUM(si.quantity) AS qty, SUM(si.subtotal) AS revenue
      FROM "SaleItem" si
      JOIN "Sale" s ON s.id = si."saleId"
      JOIN "Product" p ON p.id = si."productId"
      WHERE s."companyId" = ${actor.companyId} AND s.status = 'COMPLETED' ${fromCond} ${toCond}
      GROUP BY si."productId", p.name
      ORDER BY revenue DESC
      LIMIT 5
    `);

    return {
      total: Number(agg._sum.total ?? 0),
      count: agg._count,
      byType: byTypeRaw.map((t) => ({ type: t.type, total: Number(t._sum.total ?? 0), count: t._count })),
      topProducts: topProducts.map((t) => ({ productId: t.productId, name: t.name, quantity: Number(t.qty), revenue: Number(t.revenue) })),
    };
  }

  /** Financial summary: open balances + cash flow in the period. */
  async financial(actor: Actor, period: Period) {
    const cid = actor.companyId;
    const paidFilter = (p: Period) =>
      p.from || p.to ? { paidAt: { ...(p.from ? { gte: p.from } : {}), ...(p.to ? { lte: p.to } : {}) } } : {};

    const [recvOpen, instOpen, payOpen, recvPaid, instPaid, payPaid] = await Promise.all([
      prisma.$queryRaw<[{ s: string }]>(Prisma.sql`SELECT COALESCE(SUM(amount - "paidAmount"),0) s FROM "AccountReceivable" WHERE "companyId"=${cid} AND "deletedAt" IS NULL AND status IN ('OPEN','PARTIAL','OVERDUE')`),
      prisma.$queryRaw<[{ s: string }]>(Prisma.sql`SELECT COALESCE(SUM(amount - "paidAmount"),0) s FROM "CustomerInstallment" WHERE "companyId"=${cid} AND status IN ('OPEN','OVERDUE')`),
      prisma.$queryRaw<[{ s: string }]>(Prisma.sql`SELECT COALESCE(SUM(amount - "paidAmount"),0) s FROM "AccountPayable" WHERE "companyId"=${cid} AND "deletedAt" IS NULL AND status IN ('OPEN','PARTIAL')`),
      prisma.accountReceivable.aggregate({ where: { companyId: cid, ...paidFilter(period) }, _sum: { paidAmount: true } }),
      prisma.customerInstallment.aggregate({ where: { companyId: cid, ...paidFilter(period) }, _sum: { paidAmount: true } }),
      prisma.accountPayable.aggregate({ where: { companyId: cid, ...paidFilter(period) }, _sum: { paidAmount: true } }),
    ]);

    return {
      receivableOpen: Number(recvOpen[0].s) + Number(instOpen[0].s),
      payableOpen: Number(payOpen[0].s),
      receivedInPeriod: Number(recvPaid._sum.paidAmount ?? 0) + Number(instPaid._sum.paidAmount ?? 0),
      paidInPeriod: Number(payPaid._sum.paidAmount ?? 0),
    };
  }

  /** Stock valuation + counts. */
  async stock(actor: Actor) {
    const cid = actor.companyId;
    const [valuation, low, count] = await Promise.all([
      prisma.$queryRaw<[{ v: string }]>(Prisma.sql`SELECT COALESCE(SUM(stock * "costPrice"),0) v FROM "Product" WHERE "companyId"=${cid} AND "deletedAt" IS NULL`),
      prisma.$queryRaw<[{ c: bigint }]>(Prisma.sql`SELECT COUNT(*) c FROM "Product" WHERE "companyId"=${cid} AND "deletedAt" IS NULL AND "isActive"=true AND stock <= "minStock"`),
      prisma.product.count({ where: { companyId: cid, deletedAt: null, isActive: true } }),
    ]);
    return {
      stockValue: Number(valuation[0].v),
      lowStockCount: Number(low[0].c),
      productsCount: count,
    };
  }

  /** Credit / crediário summary. */
  async credit(actor: Actor) {
    const cid = actor.companyId;
    const [used, overdue, active] = await Promise.all([
      prisma.customerCredit.aggregate({ where: { companyId: cid }, _sum: { usedCredit: true } }),
      prisma.$queryRaw<[{ s: string }]>(Prisma.sql`SELECT COALESCE(SUM(amount - "paidAmount"),0) s FROM "CustomerInstallment" WHERE "companyId"=${cid} AND (status='OVERDUE' OR (status='OPEN' AND "dueDate" < NOW()))`),
      prisma.customerInstallment.count({ where: { companyId: cid, status: 'OPEN' } }),
    ]);
    return {
      totalUsedCredit: Number(used._sum.usedCredit ?? 0),
      overdueTotal: Number(overdue[0].s),
      activeInstallments: active,
    };
  }
}

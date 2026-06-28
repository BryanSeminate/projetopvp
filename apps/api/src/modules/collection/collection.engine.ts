import { prisma } from '../../lib/prisma.js';
import { render, waLink, startOfToday, daysLate } from './collection.service.js';

/** Flips OPEN installments past due to OVERDUE. Optionally scoped to a company. */
export async function flipOverdueInstallments(companyId?: string) {
  const res = await prisma.customerInstallment.updateMany({
    where: { status: 'OPEN', dueDate: { lt: new Date() }, ...(companyId ? { companyId } : {}) },
    data: { status: 'OVERDUE' },
  });
  return res.count;
}

interface RunOpts {
  companyId?: string; // limit to one company (manual trigger); omit = all companies (scheduler)
  force?: boolean; // ignore the hour window (manual trigger)
}

const DEFAULT_TEMPLATE =
  'Olá {nome}, você tem {parcela} em aberto totalizando R$ {valor}, vencidas há {dias} dias. Regularize, por favor. {empresa}';

/**
 * Automatic collection engine. For each active rule, finds eligible delinquent
 * customers and creates a CollectionHistory record (one per customer per day).
 *
 * Respects: rule hour window, days-overdue threshold, per-day dedupe,
 * customer opt-out (autoCollection), and skips customers without a phone.
 * Stopped debts (paid/renegotiated) never qualify — their installments are no
 * longer OPEN/OVERDUE.
 */
export async function runAutoCollection(opts: RunOpts = {}) {
  await flipOverdueInstallments(opts.companyId);

  const now = new Date();
  const hour = now.getHours();
  const since = startOfToday();

  const rules = await prisma.collectionRule.findMany({
    where: { isActive: true, ...(opts.companyId ? { companyId: opts.companyId } : {}) },
    include: { message: true },
  });

  const companyNames = new Map<string, string>();
  let sent = 0;

  for (const rule of rules) {
    if (!opts.force && (hour < rule.startHour || hour >= rule.endHour)) continue;

    const cutoff = new Date(now.getTime() - rule.daysOverdue * 86_400_000);
    const insts = await prisma.customerInstallment.findMany({
      where: {
        companyId: rule.companyId,
        status: { in: ['OPEN', 'OVERDUE'] },
        dueDate: { lt: cutoff },
      },
      include: { customer: { include: { credit: true } } },
    });

    // aggregate per customer
    const byCustomer = new Map<string, { phone: string; name: string; total: number; oldest: Date; count: number }>();
    for (const i of insts) {
      const c = i.customer;
      if (!c.phone) continue; // sem telefone: não cobra
      if (c.credit && c.credit.autoCollection === false) continue; // opt-out
      const bal = Number(i.amount) - Number(i.paidAmount);
      const cur = byCustomer.get(c.id) ?? { phone: c.phone, name: c.name, total: 0, oldest: i.dueDate, count: 0 };
      cur.total += bal;
      if (new Date(i.dueDate) < new Date(cur.oldest)) cur.oldest = i.dueDate;
      cur.count += 1;
      byCustomer.set(c.id, cur);
    }

    if (!companyNames.has(rule.companyId)) {
      const company = await prisma.company.findUnique({ where: { id: rule.companyId }, select: { tradeName: true, legalName: true } });
      companyNames.set(rule.companyId, company?.tradeName ?? company?.legalName ?? '');
    }
    const empresa = companyNames.get(rule.companyId)!;
    const template = rule.message?.template ?? DEFAULT_TEMPLATE;

    for (const [customerId, info] of byCustomer) {
      // dedupe: já houve cobrança SENT hoje para este cliente?
      const already = await prisma.collectionHistory.findFirst({
        where: { companyId: rule.companyId, customerId, createdAt: { gte: since }, status: 'SENT' },
        select: { id: true },
      });
      if (already) continue;

      const content = render(template, {
        nome: info.name,
        valor: info.total.toFixed(2),
        dias: String(daysLate(info.oldest)),
        parcela: `${info.count} parcela(s)`,
        empresa,
      });

      await prisma.collectionHistory.create({
        data: {
          companyId: rule.companyId,
          customerId,
          channel: 'WHATSAPP',
          status: 'SENT',
          content,
          link: waLink(info.phone, content),
          sentAt: new Date(),
        },
      });
      sent += 1;
    }
  }

  return { sent };
}

import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import type { CreateMessageInput, SendInput, UpdateMessageInput } from './collection.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

export const daysLate = (due: Date) =>
  Math.max(0, Math.floor((Date.now() - new Date(due).getTime()) / 86_400_000));

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Builds a wa.me click-to-chat link. Brazilian numbers get a 55 prefix. */
export function waLink(phone: string, text: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.length <= 11) digits = `55${digits}`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export function render(
  template: string,
  vars: { nome: string; valor: string; dias: string; parcela: string; empresa: string },
): string {
  return template
    .replaceAll('{nome}', vars.nome)
    .replaceAll('{valor}', vars.valor)
    .replaceAll('{dias}', vars.dias)
    .replaceAll('{parcela}', vars.parcela)
    .replaceAll('{empresa}', vars.empresa);
}

export class CollectionService {
  // ----- templates -----
  async listMessages(actor: Actor) {
    return prisma.collectionMessage.findMany({
      where: { companyId: actor.companyId, deletedAt: null },
      orderBy: { name: 'asc' },
    });
  }

  async createMessage(actor: Actor, data: CreateMessageInput) {
    const msg = await prisma.collectionMessage.create({ data: { ...data, companyId: actor.companyId } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'CREATE', entity: 'CollectionMessage', entityId: msg.id, after: msg });
    return msg;
  }

  async updateMessage(actor: Actor, id: string, data: UpdateMessageInput) {
    const existing = await prisma.collectionMessage.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError('Modelo não encontrado');
    return prisma.collectionMessage.update({ where: { id }, data });
  }

  async deleteMessage(actor: Actor, id: string) {
    const existing = await prisma.collectionMessage.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null } });
    if (!existing) throw new NotFoundError('Modelo não encontrado');
    return prisma.collectionMessage.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
  }

  // ----- send (manual) -----
  async send(actor: Actor, input: SendInput) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, companyId: actor.companyId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Cliente não encontrado');
    if (!customer.phone) throw new BadRequestError('Cliente sem telefone cadastrado');

    // opt-out: cobrança automática desligada não impede manual, mas registramos
    // (regra de auto fica no módulo futuro)

    // determina valor/dias/parcela
    let valor: number;
    let dias: number;
    let parcelaLabel: string;

    if (input.installmentId) {
      const inst = await prisma.customerInstallment.findFirst({
        where: { id: input.installmentId, companyId: actor.companyId, customerId: customer.id },
      });
      if (!inst) throw new NotFoundError('Parcela não encontrada');
      if (inst.status === 'PAID' || inst.status === 'CANCELED' || inst.status === 'RENEGOTIATED') {
        throw new BadRequestError('Parcela não está em aberto — cobrança interrompida');
      }
      valor = Number(inst.amount) - Number(inst.paidAmount);
      dias = daysLate(inst.dueDate);
      parcelaLabel = `#${inst.number}`;
    } else {
      // agrega tudo que está vencido do cliente
      const overdue = await prisma.customerInstallment.findMany({
        where: {
          companyId: actor.companyId,
          customerId: customer.id,
          OR: [{ status: 'OVERDUE' }, { status: 'OPEN', dueDate: { lt: new Date() } }],
        },
        orderBy: { dueDate: 'asc' },
      });
      if (!overdue.length) throw new BadRequestError('Cliente não possui parcelas vencidas');
      valor = overdue.reduce((acc, i) => acc + (Number(i.amount) - Number(i.paidAmount)), 0);
      dias = daysLate(overdue[0].dueDate);
      parcelaLabel = `${overdue.length} parcela(s)`;
    }

    // dedupe: não enviar cobrança duplicada no mesmo dia
    const already = await prisma.collectionHistory.findFirst({
      where: {
        companyId: actor.companyId,
        customerId: customer.id,
        ...(input.installmentId ? { installmentId: input.installmentId } : {}),
        createdAt: { gte: startOfToday() },
        status: 'SENT',
      },
    });
    if (already) throw new ConflictError('Cobrança já registrada hoje para este cliente/parcela');

    // template
    const message = input.messageId
      ? await prisma.collectionMessage.findFirst({ where: { id: input.messageId, companyId: actor.companyId, deletedAt: null } })
      : await prisma.collectionMessage.findFirst({ where: { companyId: actor.companyId, isActive: true, deletedAt: null }, orderBy: { createdAt: 'asc' } });
    if (!message) throw new BadRequestError('Nenhum modelo de mensagem disponível');

    const company = await prisma.company.findUnique({ where: { id: actor.companyId }, select: { tradeName: true, legalName: true } });
    const content = render(message.template, {
      nome: customer.name,
      valor: valor.toFixed(2),
      dias: String(dias),
      parcela: parcelaLabel,
      empresa: company?.tradeName ?? company?.legalName ?? '',
    });
    const link = waLink(customer.phone, content);

    const history = await prisma.collectionHistory.create({
      data: {
        companyId: actor.companyId,
        customerId: customer.id,
        installmentId: input.installmentId ?? null,
        channel: 'WHATSAPP',
        status: 'SENT', // manual: link gerado conta como enviado
        content,
        link,
        sentAt: new Date(),
        userId: actor.userId,
      },
    });

    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'COLLECTION_SEND', entity: 'CollectionHistory', entityId: history.id, after: { customerId: customer.id, valor } });
    return { historyId: history.id, link, content };
  }

  // ----- regras de cobrança automática -----
  async listRules(actor: Actor) {
    return prisma.collectionRule.findMany({
      where: { companyId: actor.companyId },
      include: { message: { select: { id: true, name: true } } },
      orderBy: { daysOverdue: 'asc' },
    });
  }

  async createRule(actor: Actor, data: { name: string; daysOverdue: number; startHour: number; endHour: number; messageId?: string }) {
    const rule = await prisma.collectionRule.create({ data: { ...data, companyId: actor.companyId } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'CREATE', entity: 'CollectionRule', entityId: rule.id, after: rule });
    return rule;
  }

  async updateRule(actor: Actor, id: string, data: Record<string, unknown>) {
    const existing = await prisma.collectionRule.findFirst({ where: { id, companyId: actor.companyId } });
    if (!existing) throw new NotFoundError('Regra não encontrada');
    return prisma.collectionRule.update({ where: { id }, data });
  }

  async deleteRule(actor: Actor, id: string) {
    const existing = await prisma.collectionRule.findFirst({ where: { id, companyId: actor.companyId } });
    if (!existing) throw new NotFoundError('Regra não encontrada');
    return prisma.collectionRule.delete({ where: { id } });
  }

  async history(actor: Actor, params: { customerId?: string; page: number; pageSize: number }) {
    const where = {
      companyId: actor.companyId,
      ...(params.customerId ? { customerId: params.customerId } : {}),
    };
    const [items, total] = await Promise.all([
      prisma.collectionHistory.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.collectionHistory.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }
}

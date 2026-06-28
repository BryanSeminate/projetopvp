import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateCustomerInput, UpdateCustomerInput } from './customer.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface ListParams {
  search?: string;
  active?: 'true' | 'false';
  page: number;
  pageSize: number;
}

export class CustomerService {
  private async assertUniqueDocument(companyId: string, document?: string, exceptId?: string) {
    if (!document) return;
    const dup = await prisma.customer.findFirst({
      where: {
        companyId,
        document,
        deletedAt: null,
        ...(exceptId ? { NOT: { id: exceptId } } : {}),
      },
    });
    if (dup) throw new ConflictError('Já existe cliente com este documento');
  }

  async list(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
      ...(params.active ? { isActive: params.active === 'true' } : {}),
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { document: { contains: params.search } },
              { phone: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.customer.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const customer = await prisma.customer.findFirst({
      where: { id, companyId: actor.companyId, deletedAt: null },
    });
    if (!customer) throw new NotFoundError('Cliente não encontrado');
    return customer;
  }

  async create(actor: Actor, data: CreateCustomerInput) {
    await this.assertUniqueDocument(actor.companyId, data.document);
    const customer = await prisma.customer.create({
      data: { ...data, companyId: actor.companyId },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'Customer',
      entityId: customer.id,
      after: customer,
    });
    return customer;
  }

  async update(actor: Actor, id: string, data: UpdateCustomerInput) {
    const before = await this.getById(actor, id);
    if (data.document && data.document !== before.document) {
      await this.assertUniqueDocument(actor.companyId, data.document, id);
    }
    const customer = await prisma.customer.update({ where: { id }, data });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'Customer',
      entityId: id,
      before,
      after: customer,
    });
    return customer;
  }

  /** Soft delete — customer keeps history (sales/credit). Never hard delete. */
  async softDelete(actor: Actor, id: string) {
    const before = await this.getById(actor, id);
    const customer = await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'DELETE',
      entity: 'Customer',
      entityId: id,
      before,
    });
    return customer;
  }
}

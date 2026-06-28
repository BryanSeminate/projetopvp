import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateSupplierInput, UpdateSupplierInput } from './supplier.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

export class SupplierService {
  private async assertUniqueDocument(companyId: string, document?: string, exceptId?: string) {
    if (!document) return;
    const dup = await prisma.supplier.findFirst({
      where: { companyId, document, deletedAt: null, ...(exceptId ? { NOT: { id: exceptId } } : {}) },
    });
    if (dup) throw new ConflictError('Já existe fornecedor com este documento');
  }

  async list(actor: Actor, params: { search?: string; page: number; pageSize: number }) {
    const where = {
      companyId: actor.companyId,
      deletedAt: null,
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
      prisma.supplier.findMany({ where, orderBy: { name: 'asc' }, skip: (params.page - 1) * params.pageSize, take: params.pageSize }),
      prisma.supplier.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const supplier = await prisma.supplier.findFirst({ where: { id, companyId: actor.companyId, deletedAt: null } });
    if (!supplier) throw new NotFoundError('Fornecedor não encontrado');
    return supplier;
  }

  async create(actor: Actor, data: CreateSupplierInput) {
    await this.assertUniqueDocument(actor.companyId, data.document);
    const supplier = await prisma.supplier.create({ data: { ...data, companyId: actor.companyId } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'CREATE', entity: 'Supplier', entityId: supplier.id, after: supplier });
    return supplier;
  }

  async update(actor: Actor, id: string, data: UpdateSupplierInput) {
    const before = await this.getById(actor, id);
    if (data.document && data.document !== before.document) await this.assertUniqueDocument(actor.companyId, data.document, id);
    const supplier = await prisma.supplier.update({ where: { id }, data });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'UPDATE', entity: 'Supplier', entityId: id, before, after: supplier });
    return supplier;
  }

  async softDelete(actor: Actor, id: string) {
    const before = await this.getById(actor, id);
    const supplier = await prisma.supplier.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await audit({ companyId: actor.companyId, userId: actor.userId, action: 'DELETE', entity: 'Supplier', entityId: id, before });
    return supplier;
  }
}

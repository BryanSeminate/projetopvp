import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';

interface Actor {
  userId: string;
  companyId: string;
}

type Delegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  findFirst: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<{ id: string }>;
  update: (args: unknown) => Promise<{ id: string }>;
};

/**
 * Shared CRUD for simple company-scoped name entities (ProductCategory,
 * ProductBrand). Soft delete + unique name per company + audit.
 */
export class TaxonomyService {
  constructor(
    private readonly delegate: Delegate,
    private readonly entity: 'ProductCategory' | 'ProductBrand',
  ) {}

  async list(actor: Actor, search?: string) {
    return this.delegate.findMany({
      where: {
        companyId: actor.companyId,
        deletedAt: null,
        ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getById(actor: Actor, id: string) {
    const row = await this.delegate.findFirst({
      where: { id, companyId: actor.companyId, deletedAt: null },
    });
    if (!row) throw new NotFoundError(`${this.entity} não encontrado`);
    return row;
  }

  async create(actor: Actor, name: string) {
    const dup = await this.delegate.findFirst({
      where: { companyId: actor.companyId, name, deletedAt: null },
    });
    if (dup) throw new ConflictError('Já existe registro com este nome');

    const row = await this.delegate.create({ data: { companyId: actor.companyId, name } });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: this.entity,
      entityId: row.id,
      after: { name },
    });
    return row;
  }

  async update(actor: Actor, id: string, name?: string) {
    await this.getById(actor, id);
    if (name) {
      const dup = await this.delegate.findFirst({
        where: { companyId: actor.companyId, name, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictError('Já existe registro com este nome');
    }
    const row = await this.delegate.update({ where: { id }, data: { name } });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: this.entity,
      entityId: id,
      after: { name },
    });
    return row;
  }

  async softDelete(actor: Actor, id: string) {
    await this.getById(actor, id);
    const row = await this.delegate.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'DELETE',
      entity: this.entity,
      entityId: id,
    });
    return row;
  }
}

export const categoryService = new TaxonomyService(
  prisma.productCategory as unknown as Delegate,
  'ProductCategory',
);
export const brandService = new TaxonomyService(
  prisma.productBrand as unknown as Delegate,
  'ProductBrand',
);

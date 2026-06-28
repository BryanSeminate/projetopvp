import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import { ConflictError, NotFoundError } from '../../shared/errors/AppError.js';
import type { CreateCompanyInput, UpdateCompanyInput } from './company.schema.js';

interface Actor {
  userId: string;
  companyId?: string;
}

export class CompanyService {
  async list(params: { search?: string; page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      ...(params.search
        ? {
            OR: [
              { legalName: { contains: params.search, mode: 'insensitive' as const } },
              { tradeName: { contains: params.search, mode: 'insensitive' as const } },
              { document: { contains: params.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.company.findMany({
        where,
        orderBy: { legalName: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.company.count({ where }),
    ]);

    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(id: string) {
    const company = await prisma.company.findFirst({ where: { id, deletedAt: null } });
    if (!company) throw new NotFoundError('Empresa não encontrada');
    return company;
  }

  async create(data: CreateCompanyInput, actor: Actor) {
    const exists = await prisma.company.findFirst({
      where: { document: data.document, deletedAt: null },
    });
    if (exists) throw new ConflictError('Já existe empresa com este documento');

    const company = await prisma.company.create({ data });
    await audit({
      companyId: company.id,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'Company',
      entityId: company.id,
      after: company,
    });
    return company;
  }

  async update(id: string, data: UpdateCompanyInput, actor: Actor) {
    const before = await this.getById(id);

    if (data.document && data.document !== before.document) {
      const dup = await prisma.company.findFirst({
        where: { document: data.document, deletedAt: null, NOT: { id } },
      });
      if (dup) throw new ConflictError('Já existe empresa com este documento');
    }

    const company = await prisma.company.update({ where: { id }, data });
    await audit({
      companyId: id,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'Company',
      entityId: id,
      before,
      after: company,
    });
    return company;
  }

  async softDelete(id: string, actor: Actor) {
    const before = await this.getById(id);
    const company = await prisma.company.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
    await audit({
      companyId: id,
      userId: actor.userId,
      action: 'DELETE',
      entity: 'Company',
      entityId: id,
      before,
    });
    return company;
  }
}

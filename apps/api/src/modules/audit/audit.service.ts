import { prisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../shared/errors/AppError.js';

interface Actor {
  userId: string;
  companyId: string;
}

interface ListParams {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

const userSelect = { select: { id: true, name: true, email: true } } as const;

export class AuditQueryService {
  async list(actor: Actor, params: ListParams) {
    const where = {
      companyId: actor.companyId,
      ...(params.entity ? { entity: params.entity } : {}),
      ...(params.entityId ? { entityId: params.entityId } : {}),
      ...(params.action ? { action: params.action } : {}),
      ...(params.userId ? { userId: params.userId } : {}),
      ...(params.from || params.to
        ? {
            createdAt: {
              ...(params.from ? { gte: params.from } : {}),
              ...(params.to ? { lte: params.to } : {}),
            },
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: { user: userSelect },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.auditLog.count({ where }),
    ]);
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  async getById(actor: Actor, id: string) {
    const log = await prisma.auditLog.findFirst({
      where: { id, companyId: actor.companyId },
      include: { user: userSelect },
    });
    if (!log) throw new NotFoundError('Log não encontrado');
    return log;
  }
}

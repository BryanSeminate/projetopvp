import { prisma } from '../../lib/prisma.js';
import { hashPassword } from '../../lib/bcrypt.js';
import { audit } from '../../shared/audit/audit.js';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../shared/errors/AppError.js';
import type { CreateUserInput, UpdateUserInput } from './user.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

const PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  isBlocked: true,
  lastLoginAt: true,
  createdAt: true,
} as const;

export class UserService {
  /** Ensures the role exists (roles are global). */
  private async assertRole(roleId: string) {
    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) throw new BadRequestError('Perfil (role) inexistente');
    return role;
  }

  /** Lists users linked to the active company, with their role in it. */
  async list(actor: Actor, params: { search?: string; page: number; pageSize: number }) {
    const where = {
      deletedAt: null,
      companies: { some: { companyId: actor.companyId } },
      ...(params.search
        ? {
            OR: [
              { name: { contains: params.search, mode: 'insensitive' as const } },
              { email: { contains: params.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          ...PUBLIC_SELECT,
          companies: {
            where: { companyId: actor.companyId },
            select: { role: { select: { id: true, name: true } }, isActive: true },
          },
        },
        orderBy: { name: 'asc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      prisma.user.count({ where }),
    ]);

    const items = rows.map(({ companies, ...u }) => ({
      ...u,
      role: companies[0]?.role ?? null,
      linkActive: companies[0]?.isActive ?? false,
    }));
    return { items, total, page: params.page, pageSize: params.pageSize };
  }

  /** Detail — only if the user belongs to the active company. */
  async getById(actor: Actor, id: string) {
    const user = await prisma.user.findFirst({
      where: { id, deletedAt: null, companies: { some: { companyId: actor.companyId } } },
      select: {
        ...PUBLIC_SELECT,
        companies: {
          select: {
            companyId: true,
            isActive: true,
            company: { select: { legalName: true, tradeName: true } },
            role: { select: { id: true, name: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundError('Usuário não encontrado');
    return user;
  }

  /** Creates a user and links it to the active company with the given role. */
  async create(actor: Actor, data: CreateUserInput) {
    await this.assertRole(data.roleId);
    const exists = await prisma.user.findUnique({ where: { email: data.email } });
    if (exists) throw new ConflictError('E-mail já cadastrado');

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        companies: {
          create: { companyId: actor.companyId, roleId: data.roleId },
        },
      },
      select: PUBLIC_SELECT,
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      after: user,
    });
    return user;
  }

  async update(actor: Actor, id: string, data: UpdateUserInput) {
    const before = await this.getById(actor, id);

    if (data.email && data.email !== before.email) {
      const dup = await prisma.user.findUnique({ where: { email: data.email } });
      if (dup) throw new ConflictError('E-mail já cadastrado');
    }

    const user = await prisma.user.update({
      where: { id },
      data: { name: data.name, email: data.email, isActive: data.isActive },
      select: PUBLIC_SELECT,
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      before,
      after: user,
    });
    return user;
  }

  async setBlocked(actor: Actor, id: string, blocked: boolean) {
    if (id === actor.userId) throw new ForbiddenError('Não é possível bloquear a si mesmo');
    await this.getById(actor, id); // scope check

    const user = await prisma.user.update({
      where: { id },
      data: { isBlocked: blocked },
      select: PUBLIC_SELECT,
    });
    // revoke active sessions when blocking
    if (blocked) {
      await prisma.refreshToken.updateMany({
        where: { userId: id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: blocked ? 'BLOCK' : 'UNBLOCK',
      entity: 'User',
      entityId: id,
    });
    return user;
  }

  /** Changes the user's role within the active company. */
  async setRole(actor: Actor, id: string, roleId: string) {
    await this.assertRole(roleId);
    const link = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: id, companyId: actor.companyId } },
    });
    if (!link) throw new NotFoundError('Usuário não vinculado a esta empresa');

    const updated = await prisma.userCompany.update({
      where: { id: link.id },
      data: { roleId },
      select: { userId: true, companyId: true, role: { select: { id: true, name: true } } },
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'UserCompany',
      entityId: link.id,
      before: { roleId: link.roleId },
      after: { roleId },
    });
    return updated;
  }

  /** Links a user to another company (admin operation). */
  async linkCompany(actor: Actor, id: string, companyId: string, roleId: string) {
    await this.assertRole(roleId);
    const company = await prisma.company.findFirst({ where: { id: companyId, deletedAt: null } });
    if (!company) throw new NotFoundError('Empresa não encontrada');

    const link = await prisma.userCompany.upsert({
      where: { userId_companyId: { userId: id, companyId } },
      update: { roleId, isActive: true },
      create: { userId: id, companyId, roleId },
      select: { userId: true, companyId: true, isActive: true, role: { select: { id: true, name: true } } },
    });

    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'LINK',
      entity: 'UserCompany',
      entityId: `${id}:${companyId}`,
      after: link,
    });
    return link;
  }

  /** Roles list (global) for dropdowns. */
  async listRoles() {
    return prisma.role.findMany({
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
    });
  }
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { ForbiddenError, UnauthorizedError } from '../shared/errors/AppError.js';

/**
 * Ensures an active company is selected and that the authenticated user belongs
 * to it. Loads the user's role + permissions (scoped to that company) into req.auth.
 *
 * Run AFTER `authenticate`. Use on every route that touches company-scoped data.
 */
export async function requireCompany(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  if (!req.auth?.userId) throw new UnauthorizedError();
  const companyId = req.auth.companyId;
  if (!companyId) {
    throw new ForbiddenError('Nenhuma empresa selecionada. Faça /auth/select-company.');
  }

  const link = await prisma.userCompany.findFirst({
    where: { userId: req.auth.userId, companyId, isActive: true },
    select: {
      roleId: true,
      company: { select: { isActive: true, deletedAt: true } },
      role: {
        select: {
          permissions: { select: { permission: { select: { code: true } } } },
        },
      },
    },
  });

  if (!link) throw new ForbiddenError('Usuário não vinculado a esta empresa');
  if (!link.company.isActive || link.company.deletedAt) {
    throw new ForbiddenError('Empresa inativa');
  }

  req.auth.roleId = link.roleId;
  req.auth.permissions = link.role.permissions.map((p) => p.permission.code);
}

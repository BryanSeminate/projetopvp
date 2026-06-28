import type { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../shared/errors/AppError.js';

/**
 * Verifies the JWT access token and populates req.auth with userId (+ companyId if present).
 * Also checks the user still exists, is active and not blocked.
 */
export async function authenticate(req: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await req.jwtVerify();
  } catch {
    throw new UnauthorizedError('Token inválido ou expirado');
  }

  const payload = req.user;
  const user = await prisma.user.findFirst({
    where: { id: payload.sub, deletedAt: null },
    select: { id: true, isActive: true, isBlocked: true },
  });

  if (!user) throw new UnauthorizedError('Usuário não encontrado');
  if (!user.isActive) throw new UnauthorizedError('Usuário inativo');
  if (user.isBlocked) throw new ForbiddenError('Usuário bloqueado');

  req.auth = {
    userId: user.id,
    companyId: payload.companyId,
  };
}

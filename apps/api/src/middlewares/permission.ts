import type { FastifyRequest, FastifyReply } from 'fastify';
import { ForbiddenError } from '../shared/errors/AppError.js';

/**
 * Factory: returns a handler that asserts the current user's role (in the active
 * company) holds the given permission code. Run AFTER `requireCompany`.
 *
 * Backend is the source of truth — never rely on the frontend hiding a button.
 */
export function requirePermission(code: string) {
  return async (req: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const perms = req.auth?.permissions ?? [];
    if (!perms.includes(code)) {
      throw new ForbiddenError(`Permissão necessária: ${code}`);
    }
  };
}

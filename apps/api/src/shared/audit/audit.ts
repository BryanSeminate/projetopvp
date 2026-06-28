import { prisma } from '../../lib/prisma.js';

interface AuditInput {
  companyId?: string | null;
  userId?: string | null;
  action: string; // CREATE, UPDATE, DELETE, OVERRIDE, LOGIN, LOGOUT
  entity: string;
  entityId?: string | null;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/** Fire-and-forget audit log. Never throws to caller. */
export async function audit(input: AuditInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: input.companyId ?? null,
        userId: input.userId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        before: input.before === undefined ? undefined : (input.before as object),
        after: input.after === undefined ? undefined : (input.after as object),
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  } catch (err) {
    console.error('[audit] failed to write log', err);
  }
}

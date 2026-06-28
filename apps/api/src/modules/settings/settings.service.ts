import { prisma } from '../../lib/prisma.js';
import { audit } from '../../shared/audit/audit.js';
import type { UpdateSettingsInput } from './settings.schema.js';

interface Actor {
  userId: string;
  companyId: string;
}

export class SettingsService {
  /** Returns the company settings, creating defaults on first access. */
  async get(actor: Actor) {
    const existing = await prisma.systemSettings.findUnique({ where: { companyId: actor.companyId } });
    if (existing) return existing;
    return prisma.systemSettings.create({ data: { companyId: actor.companyId } });
  }

  async update(actor: Actor, data: UpdateSettingsInput) {
    await this.get(actor); // ensure row exists
    const updated = await prisma.systemSettings.update({
      where: { companyId: actor.companyId },
      data,
    });
    await audit({
      companyId: actor.companyId,
      userId: actor.userId,
      action: 'UPDATE',
      entity: 'SystemSettings',
      entityId: updated.id,
      after: data,
    });
    return updated;
  }
}

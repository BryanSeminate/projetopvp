import { prisma } from '../../lib/prisma.js';
import { comparePassword, hashPassword } from '../../lib/bcrypt.js';
import { generateOpaqueToken, expiryFromNow } from '../../lib/token.js';
import { env } from '../../config/env.js';
import { audit } from '../../shared/audit/audit.js';
import {
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from '../../shared/errors/AppError.js';
import type { AccessTokenPayload } from '../../types/fastify.js';

type SignAccess = (payload: AccessTokenPayload) => string;

interface ReqMeta {
  ip?: string | null;
  userAgent?: string | null;
}

export class AuthService {
  constructor(private readonly signAccess: SignAccess) {}

  private async issueRefreshToken(userId: string): Promise<string> {
    const token = generateOpaqueToken();
    await prisma.refreshToken.create({
      data: { userId, token, expiresAt: expiryFromNow(env.JWT_REFRESH_EXPIRES_IN) },
    });
    return token;
  }

  async login(email: string, password: string, meta: ReqMeta) {
    const user = await prisma.user.findFirst({
      where: { email, deletedAt: null },
    });
    // generic message — do not leak which part failed
    if (!user) throw new UnauthorizedError('Credenciais inválidas');
    if (!user.isActive) throw new UnauthorizedError('Usuário inativo');
    if (user.isBlocked) throw new ForbiddenError('Usuário bloqueado');

    const ok = await comparePassword(password, user.passwordHash);
    if (!ok) throw new UnauthorizedError('Credenciais inválidas');

    const accessToken = this.signAccess({ sub: user.id });
    const refreshToken = await this.issueRefreshToken(user.id);

    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await audit({ userId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ...meta });

    const companies = await this.listCompanies(user.id);
    return {
      accessToken,
      refreshToken,
      user: { id: user.id, name: user.name, email: user.email },
      companies,
    };
  }

  async refresh(refreshToken: string) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    // rotate: revoke old, issue new
    await prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    const newRefresh = await this.issueRefreshToken(stored.userId);
    const accessToken = this.signAccess({ sub: stored.userId });

    return { accessToken, refreshToken: newRefresh };
  }

  async selectCompany(userId: string, companyId: string) {
    const link = await prisma.userCompany.findFirst({
      where: { userId, companyId, isActive: true },
      select: { company: { select: { id: true, isActive: true, deletedAt: true, tradeName: true, legalName: true } } },
    });
    if (!link) throw new ForbiddenError('Usuário não vinculado a esta empresa');
    if (!link.company.isActive || link.company.deletedAt) throw new ForbiddenError('Empresa inativa');

    const accessToken = this.signAccess({ sub: userId, companyId });
    return {
      accessToken,
      company: { id: link.company.id, name: link.company.tradeName ?? link.company.legalName },
    };
  }

  async logout(refreshToken: string, meta: ReqMeta) {
    const stored = await prisma.refreshToken.findUnique({ where: { token: refreshToken } });
    if (stored && !stored.revokedAt) {
      await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
      await audit({ userId: stored.userId, action: 'LOGOUT', entity: 'User', entityId: stored.userId, ...meta });
    }
    return { success: true };
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
    // always return success — do not reveal whether email exists
    if (!user) return { success: true };

    const token = generateOpaqueToken(24);
    await prisma.passwordReset.create({
      data: { userId: user.id, token, expiresAt: expiryFromNow('1h') },
    });
    // TODO: send by email. For now return token in dev only.
    return { success: true, token: env.NODE_ENV === 'development' ? token : undefined };
  }

  async resetPassword(token: string, password: string) {
    const reset = await prisma.passwordReset.findUnique({ where: { token } });
    if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
      throw new UnauthorizedError('Token de redefinição inválido ou expirado');
    }
    const passwordHash = await hashPassword(password);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
      prisma.passwordReset.update({ where: { id: reset.id }, data: { usedAt: new Date() } }),
      prisma.refreshToken.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
    return { success: true };
  }

  async listCompanies(userId: string) {
    const links = await prisma.userCompany.findMany({
      where: { userId, isActive: true, company: { isActive: true, deletedAt: null } },
      select: {
        company: { select: { id: true, legalName: true, tradeName: true } },
        role: { select: { id: true, name: true } },
      },
      orderBy: { company: { legalName: 'asc' } },
    });
    return links.map((l) => ({
      id: l.company.id,
      name: l.company.tradeName ?? l.company.legalName,
      role: l.role.name,
    }));
  }
}

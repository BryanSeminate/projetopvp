import type { FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from './auth.service.js';
import {
  loginSchema,
  refreshSchema,
  selectCompanySchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.schema.js';

const meta = (req: FastifyRequest) => ({ ip: req.ip, userAgent: req.headers['user-agent'] ?? null });

export function makeAuthController(service: AuthService) {
  return {
    async login(req: FastifyRequest, reply: FastifyReply) {
      const { email, password } = loginSchema.parse(req.body);
      const result = await service.login(email, password, meta(req));
      return reply.send(result);
    },

    async refresh(req: FastifyRequest, reply: FastifyReply) {
      const { refreshToken } = refreshSchema.parse(req.body);
      return reply.send(await service.refresh(refreshToken));
    },

    async logout(req: FastifyRequest, reply: FastifyReply) {
      const { refreshToken } = refreshSchema.parse(req.body);
      return reply.send(await service.logout(refreshToken, meta(req)));
    },

    async selectCompany(req: FastifyRequest, reply: FastifyReply) {
      const { companyId } = selectCompanySchema.parse(req.body);
      return reply.send(await service.selectCompany(req.auth.userId, companyId));
    },

    async myCompanies(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listCompanies(req.auth.userId));
    },

    async forgotPassword(req: FastifyRequest, reply: FastifyReply) {
      const { email } = forgotPasswordSchema.parse(req.body);
      return reply.send(await service.forgotPassword(email));
    },

    async resetPassword(req: FastifyRequest, reply: FastifyReply) {
      const { token, password } = resetPasswordSchema.parse(req.body);
      return reply.send(await service.resetPassword(token, password));
    },
  };
}

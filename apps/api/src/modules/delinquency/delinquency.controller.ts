import type { FastifyRequest, FastifyReply } from 'fastify';
import { DelinquencyService } from './delinquency.service.js';
import { customersQuerySchema, overdueQuerySchema } from './delinquency.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeDelinquencyController(service: DelinquencyService) {
  return {
    async panel(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.panel(actor(req)));
    },
    async customers(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.customers(actor(req), customersQuerySchema.parse(req.query)));
    },
    async overdue(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.overdueInstallments(actor(req), overdueQuerySchema.parse(req.query)));
    },
    async blocked(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.blocked(actor(req)));
    },
  };
}

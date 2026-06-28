import type { FastifyRequest, FastifyReply } from 'fastify';
import { ReportService } from './report.service.js';
import { periodQuerySchema } from './report.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeReportController(service: ReportService) {
  return {
    async sales(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.sales(actor(req), periodQuerySchema.parse(req.query)));
    },
    async financial(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.financial(actor(req), periodQuerySchema.parse(req.query)));
    },
    async stock(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.stock(actor(req)));
    },
    async credit(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.credit(actor(req)));
    },
  };
}

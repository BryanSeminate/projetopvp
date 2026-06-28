import type { FastifyRequest, FastifyReply } from 'fastify';
import { CashService } from './cash.service.js';
import {
  openCashSchema,
  movementSchema,
  closeCashSchema,
  listCashQuerySchema,
} from './cash.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeCashController(service: CashService) {
  return {
    async open(req: FastifyRequest, reply: FastifyReply) {
      const data = openCashSchema.parse(req.body);
      return reply.status(201).send(await service.open(actor(req), data));
    },
    async current(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.current(actor(req)));
    },
    async withdrawal(req: FastifyRequest, reply: FastifyReply) {
      const data = movementSchema.parse(req.body);
      return reply.status(201).send(await service.withdrawal(actor(req), data));
    },
    async supply(req: FastifyRequest, reply: FastifyReply) {
      const data = movementSchema.parse(req.body);
      return reply.status(201).send(await service.supply(actor(req), data));
    },
    async close(req: FastifyRequest, reply: FastifyReply) {
      const data = closeCashSchema.parse(req.body);
      return reply.send(await service.close(actor(req), data));
    },
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listCashQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
  };
}

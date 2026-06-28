import type { FastifyRequest, FastifyReply } from 'fastify';
import { CreditService } from './credit.service.js';
import { setLimitSchema, blockSchema, autoCollectionSchema } from './credit.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeCreditController(service: CreditService) {
  return {
    async get(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      return reply.send(await service.get(actor(req), customerId));
    },
    async setLimit(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      const { creditLimit } = setLimitSchema.parse(req.body);
      return reply.send(await service.setLimit(actor(req), customerId, creditLimit));
    },
    async block(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      const { reason } = blockSchema.parse(req.body);
      return reply.send(await service.block(actor(req), customerId, reason));
    },
    async unblock(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      return reply.send(await service.unblock(actor(req), customerId));
    },
    async setAutoCollection(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      const { autoCollection } = autoCollectionSchema.parse(req.body);
      return reply.send(await service.setAutoCollection(actor(req), customerId, autoCollection));
    },
    async history(req: FastifyRequest, reply: FastifyReply) {
      const { customerId } = req.params as { customerId: string };
      return reply.send(await service.history(actor(req), customerId));
    },
  };
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { CustomerService } from './customer.service.js';
import {
  createCustomerSchema,
  updateCustomerSchema,
  listCustomerQuerySchema,
} from './customer.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeCustomerController(service: CustomerService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listCustomerQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createCustomerSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), data));
    },
    async update(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const data = updateCustomerSchema.parse(req.body);
      return reply.send(await service.update(actor(req), id, data));
    },
    async remove(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.softDelete(actor(req), id));
    },
  };
}

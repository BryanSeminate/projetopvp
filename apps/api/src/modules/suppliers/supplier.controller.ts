import type { FastifyRequest, FastifyReply } from 'fastify';
import { SupplierService } from './supplier.service.js';
import { createSupplierSchema, updateSupplierSchema, listSupplierQuerySchema } from './supplier.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}
const id = (req: FastifyRequest) => (req.params as { id: string }).id;

export function makeSupplierController(service: SupplierService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.list(actor(req), listSupplierQuerySchema.parse(req.query)));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.getById(actor(req), id(req)));
    },
    async create(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.create(actor(req), createSupplierSchema.parse(req.body)));
    },
    async update(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.update(actor(req), id(req), updateSupplierSchema.parse(req.body)));
    },
    async remove(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.softDelete(actor(req), id(req)));
    },
  };
}

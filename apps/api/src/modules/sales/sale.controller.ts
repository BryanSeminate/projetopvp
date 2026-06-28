import type { FastifyRequest, FastifyReply } from 'fastify';
import { SaleService } from './sale.service.js';
import { createSaleSchema, cancelSaleSchema, listSaleQuerySchema } from './sale.schema.js';

function actor(req: FastifyRequest) {
  return {
    userId: req.auth.userId,
    companyId: req.auth.companyId!,
    permissions: req.auth.permissions ?? [],
  };
}

export function makeSaleController(service: SaleService) {
  return {
    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createSaleSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), data));
    },
    async cancel(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const { reason } = cancelSaleSchema.parse(req.body);
      return reply.send(await service.cancel(actor(req), id, reason));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listSaleQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async paymentMethods(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listPaymentMethods(actor(req)));
    },
  };
}

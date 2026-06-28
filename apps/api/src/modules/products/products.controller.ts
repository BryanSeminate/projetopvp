import type { FastifyRequest, FastifyReply } from 'fastify';
import { ProductService } from './product.service.js';
import { categoryService, brandService, TaxonomyService } from './taxonomy.service.js';
import {
  createProductSchema,
  updateProductSchema,
  listProductQuerySchema,
  nameSchema,
  updateNameSchema,
} from './product.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

// ----- generic taxonomy controller (categories / brands) -----
function taxonomyController(service: TaxonomyService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      const { search } = req.query as { search?: string };
      return reply.send(await service.list(actor(req), search));
    },
    async create(req: FastifyRequest, reply: FastifyReply) {
      const { name } = nameSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), name));
    },
    async update(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const { name } = updateNameSchema.parse(req.body);
      return reply.send(await service.update(actor(req), id, name));
    },
    async remove(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.softDelete(actor(req), id));
    },
  };
}

export const categoryController = taxonomyController(categoryService);
export const brandController = taxonomyController(brandService);

// ----- products controller -----
export function makeProductController(service: ProductService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listProductQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },
    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },
    async byBarcode(req: FastifyRequest, reply: FastifyReply) {
      const { barcode } = req.params as { barcode: string };
      return reply.send(await service.findByBarcode(actor(req), barcode));
    },
    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createProductSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), data));
    },
    async update(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const data = updateProductSchema.parse(req.body);
      return reply.send(await service.update(actor(req), id, data));
    },
    async remove(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.softDelete(actor(req), id));
    },
  };
}

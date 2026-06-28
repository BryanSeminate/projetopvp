import type { FastifyRequest, FastifyReply } from 'fastify';
import { CompanyService } from './company.service.js';
import {
  createCompanySchema,
  updateCompanySchema,
  listCompanyQuerySchema,
} from './company.schema.js';

export function makeCompanyController(service: CompanyService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listCompanyQuerySchema.parse(req.query);
      return reply.send(await service.list(query));
    },

    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(id));
    },

    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createCompanySchema.parse(req.body);
      const company = await service.create(data, req.auth);
      return reply.status(201).send(company);
    },

    async update(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const data = updateCompanySchema.parse(req.body);
      return reply.send(await service.update(id, data, req.auth));
    },

    async remove(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.softDelete(id, req.auth));
    },
  };
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { UserService } from './user.service.js';
import {
  createUserSchema,
  updateUserSchema,
  setRoleSchema,
  linkCompanySchema,
  listUserQuerySchema,
} from './user.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}

export function makeUserController(service: UserService) {
  return {
    async list(req: FastifyRequest, reply: FastifyReply) {
      const query = listUserQuerySchema.parse(req.query);
      return reply.send(await service.list(actor(req), query));
    },

    async getById(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.getById(actor(req), id));
    },

    async create(req: FastifyRequest, reply: FastifyReply) {
      const data = createUserSchema.parse(req.body);
      return reply.status(201).send(await service.create(actor(req), data));
    },

    async update(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const data = updateUserSchema.parse(req.body);
      return reply.send(await service.update(actor(req), id, data));
    },

    async block(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.setBlocked(actor(req), id, true));
    },

    async unblock(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.setBlocked(actor(req), id, false));
    },

    async setRole(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const { roleId } = setRoleSchema.parse(req.body);
      return reply.send(await service.setRole(actor(req), id, roleId));
    },

    async linkCompany(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      const { companyId, roleId } = linkCompanySchema.parse(req.body);
      return reply.send(await service.linkCompany(actor(req), id, companyId, roleId));
    },

    async listRoles(_req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listRoles());
    },
  };
}

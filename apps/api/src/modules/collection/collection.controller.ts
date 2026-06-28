import type { FastifyRequest, FastifyReply } from 'fastify';
import { CollectionService } from './collection.service.js';
import {
  createMessageSchema,
  updateMessageSchema,
  sendSchema,
  historyQuerySchema,
} from './collection.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}
const id = (req: FastifyRequest) => (req.params as { id: string }).id;

export function makeCollectionController(service: CollectionService) {
  return {
    async listMessages(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listMessages(actor(req)));
    },
    async createMessage(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.createMessage(actor(req), createMessageSchema.parse(req.body)));
    },
    async updateMessage(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.updateMessage(actor(req), id(req), updateMessageSchema.parse(req.body)));
    },
    async deleteMessage(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.deleteMessage(actor(req), id(req)));
    },
    async send(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.send(actor(req), sendSchema.parse(req.body)));
    },
    async history(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.history(actor(req), historyQuerySchema.parse(req.query)));
    },
  };
}

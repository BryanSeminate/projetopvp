import type { FastifyRequest, FastifyReply } from 'fastify';
import { CollectionService } from './collection.service.js';
import {
  createMessageSchema,
  updateMessageSchema,
  sendSchema,
  historyQuerySchema,
  createRuleSchema,
  updateRuleSchema,
} from './collection.schema.js';
import { runAutoCollection } from './collection.engine.js';

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

    // ----- regras automáticas -----
    async listRules(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listRules(actor(req)));
    },
    async createRule(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.createRule(actor(req), createRuleSchema.parse(req.body)));
    },
    async updateRule(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.updateRule(actor(req), id, updateRuleSchema.parse(req.body)));
    },
    async deleteRule(req: FastifyRequest, reply: FastifyReply) {
      const { id } = req.params as { id: string };
      return reply.send(await service.deleteRule(actor(req), id));
    },

    // ----- disparo manual do motor (cobra agora, ignorando janela de horário) -----
    async run(req: FastifyRequest, reply: FastifyReply) {
      const a = actor(req);
      return reply.send(await runAutoCollection({ companyId: a.companyId, force: true }));
    },
  };
}

import type { FastifyRequest, FastifyReply } from 'fastify';
import { FinanceService } from './finance.service.js';
import {
  createPayableSchema,
  updatePayableSchema,
  createReceivableSchema,
  settleSchema,
  listFinanceQuerySchema,
} from './finance.schema.js';

function actor(req: FastifyRequest) {
  return { userId: req.auth.userId, companyId: req.auth.companyId! };
}
const id = (req: FastifyRequest) => (req.params as { id: string }).id;

export function makeFinanceController(service: FinanceService) {
  return {
    // payables
    async listPayables(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listPayables(actor(req), listFinanceQuerySchema.parse(req.query)));
    },
    async getPayable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.getPayable(actor(req), id(req)));
    },
    async createPayable(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.createPayable(actor(req), createPayableSchema.parse(req.body)));
    },
    async updatePayable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.updatePayable(actor(req), id(req), updatePayableSchema.parse(req.body)));
    },
    async payPayable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.payPayable(actor(req), id(req), settleSchema.parse(req.body)));
    },
    async cancelPayable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.cancelPayable(actor(req), id(req)));
    },
    // receivables
    async listReceivables(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listReceivables(actor(req), listFinanceQuerySchema.parse(req.query)));
    },
    async getReceivable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.getReceivable(actor(req), id(req)));
    },
    async createReceivable(req: FastifyRequest, reply: FastifyReply) {
      return reply.status(201).send(await service.createReceivable(actor(req), createReceivableSchema.parse(req.body)));
    },
    async receiveReceivable(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.receiveReceivable(actor(req), id(req), settleSchema.parse(req.body)));
    },
    // installments
    async listInstallments(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.listInstallments(actor(req), listFinanceQuerySchema.parse(req.query)));
    },
    async payInstallment(req: FastifyRequest, reply: FastifyReply) {
      return reply.send(await service.payInstallment(actor(req), id(req), settleSchema.parse(req.body)));
    },
  };
}

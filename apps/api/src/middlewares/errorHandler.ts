import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { AppError } from '../shared/errors/AppError.js';

export function errorHandler(
  error: FastifyError | Error,
  req: FastifyRequest,
  reply: FastifyReply,
): void {
  // Domain errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send({
      error: error.code,
      message: error.message,
      details: error.details,
    });
    return;
  }

  // Zod validation
  if (error instanceof ZodError) {
    reply.status(422).send({
      error: 'VALIDATION_ERROR',
      message: 'Dados inválidos',
      details: error.flatten().fieldErrors,
    });
    return;
  }

  // Prisma known errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      reply.status(409).send({
        error: 'CONFLICT',
        message: 'Registro duplicado',
        details: error.meta?.target,
      });
      return;
    }
    if (error.code === 'P2025') {
      reply.status(404).send({ error: 'NOT_FOUND', message: 'Registro não encontrado' });
      return;
    }
  }

  // Fastify validation (schema)
  const statusCode = (error as FastifyError).statusCode;
  if (statusCode && statusCode < 500) {
    reply.status(statusCode).send({ error: 'BAD_REQUEST', message: error.message });
    return;
  }

  req.log.error(error);
  reply.status(500).send({ error: 'INTERNAL_ERROR', message: 'Erro interno do servidor' });
}

import type { FastifyInstance } from 'fastify';
import { CollectionService } from './collection.service.js';
import { makeCollectionController } from './collection.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function collectionRoutes(app: FastifyInstance): Promise<void> {
  const c = makeCollectionController(new CollectionService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });
  const S = PERMISSIONS.COLLECTION_SEND;

  // templates
  app.get('/messages', can(S), c.listMessages);
  app.post('/messages', can(S), c.createMessage);
  app.put('/messages/:id', can(S), c.updateMessage);
  app.delete('/messages/:id', can(S), c.deleteMessage);

  // envio manual + histórico
  app.post('/send', can(S), c.send);
  app.get('/history', can(S), c.history);

  // regras de cobrança automática
  app.get('/rules', can(S), c.listRules);
  app.post('/rules', can(S), c.createRule);
  app.put('/rules/:id', can(S), c.updateRule);
  app.delete('/rules/:id', can(S), c.deleteRule);

  // dispara o motor agora (manual)
  app.post('/run', can(S), c.run);
}

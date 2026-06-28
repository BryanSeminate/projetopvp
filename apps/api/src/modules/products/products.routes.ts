import type { FastifyInstance } from 'fastify';
import { ProductService } from './product.service.js';
import {
  makeProductController,
  categoryController,
  brandController,
} from './products.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function productRoutes(app: FastifyInstance): Promise<void> {
  const product = makeProductController(new ProductService());

  const base = { onRequest: [app.authenticate, app.requireCompany] };
  const can = (code: string) => ({ ...base, preHandler: [app.requirePermission(code)] });
  const view = can(PERMISSIONS.PRODUCT_VIEW);
  const create = can(PERMISSIONS.PRODUCT_CREATE);
  const update = can(PERMISSIONS.PRODUCT_UPDATE);

  // ----- categories -----
  app.get('/categories', view, categoryController.list);
  app.post('/categories', create, categoryController.create);
  app.put('/categories/:id', update, categoryController.update);
  app.delete('/categories/:id', update, categoryController.remove);

  // ----- brands -----
  app.get('/brands', view, brandController.list);
  app.post('/brands', create, brandController.create);
  app.put('/brands/:id', update, brandController.update);
  app.delete('/brands/:id', update, brandController.remove);

  // ----- products -----
  app.get('/', view, product.list);
  app.get('/barcode/:barcode', view, product.byBarcode);
  app.get('/:id', view, product.getById);
  app.post('/', create, product.create);
  app.put('/:id', update, product.update);
  app.delete('/:id', update, product.remove);
}

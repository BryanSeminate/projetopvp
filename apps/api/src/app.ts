import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import jwt from '@fastify/jwt';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { authenticate } from './middlewares/auth.js';
import { requireCompany } from './middlewares/companyScope.js';
import { requirePermission } from './middlewares/permission.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { companyRoutes } from './modules/companies/company.routes.js';
import { userRoutes } from './modules/users/user.routes.js';
import { productRoutes } from './modules/products/products.routes.js';
import { stockRoutes } from './modules/stock/stock.routes.js';
import { customerRoutes } from './modules/customers/customer.routes.js';
import { cashRoutes } from './modules/cash/cash.routes.js';
import { saleRoutes } from './modules/sales/sale.routes.js';
import { creditRoutes } from './modules/credit/credit.routes.js';
import { financeRoutes } from './modules/finance/finance.routes.js';
import { delinquencyRoutes } from './modules/delinquency/delinquency.routes.js';
import { collectionRoutes } from './modules/collection/collection.routes.js';
import { renegotiationRoutes } from './modules/renegotiation/renegotiation.routes.js';
import { supplierRoutes } from './modules/suppliers/supplier.routes.js';
import { purchaseRoutes } from './modules/purchases/purchase.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === 'development' ? 'info' : 'warn',
      transport: env.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  });

  // security + cross-origin
  await app.register(helmet);
  await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });

  // jwt (access tokens)
  await app.register(jwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  // decorators (middlewares exposed on the instance)
  app.decorate('authenticate', authenticate);
  app.decorate('requireCompany', requireCompany);
  app.decorate('requirePermission', requirePermission);

  // central error handling
  app.setErrorHandler(errorHandler);

  // health
  app.get('/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  // routes
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(companyRoutes, { prefix: '/companies' });
  await app.register(userRoutes, { prefix: '/users' });
  await app.register(productRoutes, { prefix: '/products' });
  await app.register(stockRoutes, { prefix: '/stock' });
  await app.register(customerRoutes, { prefix: '/customers' });
  await app.register(cashRoutes, { prefix: '/cash' });
  await app.register(saleRoutes, { prefix: '/sales' });
  await app.register(creditRoutes, { prefix: '/credit' });
  await app.register(financeRoutes, { prefix: '/finance' });
  await app.register(delinquencyRoutes, { prefix: '/delinquency' });
  await app.register(collectionRoutes, { prefix: '/collections' });
  await app.register(renegotiationRoutes, { prefix: '/renegotiations' });
  await app.register(supplierRoutes, { prefix: '/suppliers' });
  await app.register(purchaseRoutes, { prefix: '/purchases' });
  await app.register(auditRoutes, { prefix: '/audit' });

  return app;
}

import type { FastifyInstance } from 'fastify';
import { ReportService } from './report.service.js';
import { makeReportController } from './report.controller.js';
import { PERMISSIONS } from '../../shared/permissions.js';

export async function reportRoutes(app: FastifyInstance): Promise<void> {
  const c = makeReportController(new ReportService());
  const guard = {
    onRequest: [app.authenticate, app.requireCompany],
    preHandler: [app.requirePermission(PERMISSIONS.REPORT_VIEW)],
  };

  app.get('/sales', guard, c.sales);
  app.get('/financial', guard, c.financial);
  app.get('/stock', guard, c.stock);
  app.get('/credit', guard, c.credit);
}

import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
}

export const listAudit = (params: { entity?: string; action?: string; page?: number }) =>
  api.get<Paginated<AuditLog>>('/audit', { params }).then((r) => r.data);

export const getAudit = (id: string) => api.get<AuditLog>(`/audit/${id}`).then((r) => r.data);

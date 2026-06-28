import { api } from '../../lib/axios';
import type { Paginated } from '../../types/api';

export interface SendResult {
  historyId: string;
  link: string;
  content: string;
}

export interface CollectionMessage {
  id: string;
  name: string;
  template: string;
  channel: string;
  isActive: boolean;
}

export interface CollectionHistoryItem {
  id: string;
  customerId: string;
  channel: string;
  status: string;
  content: string;
  link: string | null;
  sentAt: string | null;
  createdAt: string;
}

/** Sends a manual collection — returns a wa.me link to open. */
export async function sendCollection(customerId: string, installmentId?: string): Promise<SendResult> {
  const { data } = await api.post<SendResult>('/collections/send', { customerId, installmentId });
  return data;
}

// templates
export const listMessages = () =>
  api.get<CollectionMessage[]>('/collections/messages').then((r) => r.data);
export const createMessage = (input: { name: string; template: string }) =>
  api.post<CollectionMessage>('/collections/messages', input).then((r) => r.data);
export const deleteMessage = (id: string) =>
  api.delete(`/collections/messages/${id}`).then((r) => r.data);

// history
export const listHistory = (params: { page?: number }) =>
  api.get<Paginated<CollectionHistoryItem>>('/collections/history', { params }).then((r) => r.data);

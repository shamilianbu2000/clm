import type { AuditEntry, Contract, ContractSummary, Role } from './types';

export const session = { role: 'Drafter' as Role, user: 'Dana Drafter' };

async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const res = await fetch(`/api/contracts${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-role': session.role, 'x-user': encodeURIComponent(session.user) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message ?? res.statusText);
  return data as T;
}

export interface DraftInput { title: string; counterparty: string; content: string; signers: string[] }

export const api = {
  list: () => call<ContractSummary[]>(''),
  get: (id: string) => call<Contract>(`/${id}`),
  audit: (id: string) => call<AuditEntry[]>(`/${id}/audit`),
  create: (d: DraftInput) => call<Contract>('', 'POST', d),
  update: (id: string, d: DraftInput) => call<Contract>(`/${id}`, 'PUT', d),
  submit: (id: string) => call<Contract>(`/${id}/submit`, 'POST'),
  approve: (id: string, comment?: string) => call<Contract>(`/${id}/approve`, 'POST', { comment }),
  reject: (id: string, comment: string) => call<Contract>(`/${id}/reject`, 'POST', { comment }),
  sign: (id: string, signature: string) => call<Contract>(`/${id}/sign`, 'POST', { signature }),
};

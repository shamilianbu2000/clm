import { reactive } from 'vue';
import type { AuditEntry, Comment, Contract, ContractSummary, Diff, Renewals, Role, Template, VersionMeta } from './types';

export const session = { role: 'Drafter' as Role, user: 'Dana Drafter' };
/** Shared UI setting: the "expiring soon" window (days) used by the Renewals panel and the list toggle. */
export const settings = reactive({ renewalDays: 30 });

async function call<T>(path: string, method = 'GET', body?: unknown, base = '/api/contracts'): Promise<T> {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-role': session.role, 'x-user': encodeURIComponent(session.user) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(Array.isArray(data.message) ? data.message.join(', ') : data.message ?? res.statusText);
  return data as T;
}

export interface DraftInput { title: string; counterparty: string; content: string; signers: string[]; endDate?: string }

export const api = {
  list: (f: { q?: string; status?: string; expiringWithin?: number } = {}) => {
    const p = new URLSearchParams();
    if (f.q) p.set('q', f.q);
    if (f.status) p.set('status', f.status);
    if (f.expiringWithin !== undefined) p.set('expiringWithin', String(f.expiringWithin));
    return call<ContractSummary[]>(p.toString() ? `?${p}` : '');
  },
  renewals: (days: number) => call<Renewals>(`/renewals?days=${days}`),
  templates: () => call<Template[]>('', 'GET', undefined, '/api/templates'),
  fillTemplate: (id: string, values: Record<string, string>) =>
    call<{ title: string; content: string }>(`/${id}/fill`, 'POST', { values }, '/api/templates'),
  comment: (id: string, text: string, parentId?: string) => call<Comment>(`/${id}/comments`, 'POST', { text, parentId }),
  versions: (id: string) => call<VersionMeta[]>(`/${id}/versions`),
  diff: (id: string, from: number) => call<Diff>(`/${id}/diff?from=${from}`),
  get: (id: string) => call<Contract>(`/${id}`),
  audit: (id: string) => call<AuditEntry[]>(`/${id}/audit`),
  create: (d: DraftInput) => call<Contract>('', 'POST', d),
  update: (id: string, d: DraftInput) => call<Contract>(`/${id}`, 'PUT', d),
  submit: (id: string) => call<Contract>(`/${id}/submit`, 'POST'),
  approve: (id: string, comment?: string) => call<Contract>(`/${id}/approve`, 'POST', { comment }),
  reject: (id: string, comment: string) => call<Contract>(`/${id}/reject`, 'POST', { comment }),
  sign: (id: string, signature: string) => call<Contract>(`/${id}/sign`, 'POST', { signature }),
};

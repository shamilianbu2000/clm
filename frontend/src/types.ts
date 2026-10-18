export type Role = 'Drafter' | 'Reviewer' | 'Legal' | 'Signer';
export type Status = 'DRAFT' | 'REVIEW' | 'LEGAL' | 'APPROVED' | 'SIGNED';
export const ROLES: Role[] = ['Drafter', 'Reviewer', 'Legal', 'Signer'];

export interface Signer { name: string; signature?: string; signedAt?: string }
export interface AuditEntry { at: string; actor: string; role: Role; action: string; detail?: string }
export interface Comment { id: string; parentId?: string; at: string; author: string; role: Role; text: string }
export interface VersionMeta { n: number; at: string; author: string; title: string }
export interface DiffLine { type: 'same' | 'add' | 'del'; text: string }
export interface Diff { from: number; to: number | 'current'; lines: DiffLine[]; added: number; removed: number }
export interface Template { id: string; name: string; description: string; title: string; fields: string[] }
export interface Contract {
  id: string; title: string; counterparty: string; content: string; status: Status; endDate?: string;
  signers: Signer[]; audit: AuditEntry[]; comments: Comment[]; createdAt: string; updatedAt: string;
}
export type ContractSummary = Omit<Contract, 'content' | 'audit' | 'comments'> & {
  commentCount: number; versionCount: number; daysLeft: number | null;
};
export interface RenewalItem extends ContractSummary { state: 'EXPIRED' | 'EXPIRING' }
export interface Renewals { days: number; today: string; items: RenewalItem[] }

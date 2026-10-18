export type Role = 'Drafter' | 'Reviewer' | 'Legal' | 'Signer';
export type Status = 'DRAFT' | 'REVIEW' | 'LEGAL' | 'APPROVED' | 'SIGNED';

export interface AuditEntry {
  at: string;
  actor: string;
  role: Role;
  action: string;
  detail?: string;
}

export interface Signer {
  name: string;
  signature?: string;
  signedAt?: string;
}

export interface Contract {
  id: string;
  title: string;
  counterparty: string;
  content: string; // HTML from the rich-text editor
  status: Status;
  signers: Signer[];
  audit: AuditEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  name: string;
  role: Role;
}

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

export interface Comment {
  id: string;
  parentId?: string; // set for a reply (one level of threading)
  at: string;
  author: string;
  role: Role;
  text: string;
}

export interface Version {
  n: number;
  at: string;
  author: string;
  title: string;
  content: string;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  title: string; // may contain {{placeholders}}
  content: string; // HTML with {{placeholders}}
  fields: string[]; // placeholder names found in title/content
}

export interface Contract {
  id: string;
  title: string;
  counterparty: string;
  content: string; // HTML from the rich-text editor
  status: Status;
  endDate?: string; // YYYY-MM-DD
  signers: Signer[];
  audit: AuditEntry[];
  comments: Comment[];
  versions: Version[];
  createdAt: string;
  updatedAt: string;
}

export interface Actor {
  name: string;
  role: Role;
}

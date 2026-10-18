import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Actor, AuditEntry, Contract, Role, Status } from './models';

/** Workflow: which role may act at each status, and where approval leads. */
const STEP_ROLE: Partial<Record<Status, Role>> = { DRAFT: 'Drafter', REVIEW: 'Reviewer', LEGAL: 'Legal', APPROVED: 'Signer' };
const NEXT: Partial<Record<Status, Status>> = { DRAFT: 'REVIEW', REVIEW: 'LEGAL', LEGAL: 'APPROVED' };

export interface ContractInput {
  title?: string;
  counterparty?: string;
  content?: string;
  signers?: string[];
}

@Injectable()
export class ContractsService {
  private contracts: Contract[] = [];
  private seq = 0;

  constructor() {
    const system: Actor = { name: 'Seed', role: 'Drafter' };
    const mk = (title: string, counterparty: string, content: string, signers: string[], status: Status) => {
      const c = this.create({ title, counterparty, content, signers }, system);
      if (status !== 'DRAFT') this.advance(c, 'DRAFT', 'REVIEW', 'Submitted for review', { name: 'Dana Drafter', role: 'Drafter' });
      return c;
    };
    mk('Master Services Agreement', 'Acme Corp', '<h2>Master Services Agreement</h2><p>This agreement governs the provision of <strong>consulting services</strong> by Provider to Acme Corp.</p><ul><li>Term: 24 months</li><li>Payment: Net 30</li></ul>', ['Alice Acme', 'Bob Provider'], 'DRAFT');
    mk('Non-Disclosure Agreement', 'Globex Ltd', '<h2>Mutual NDA</h2><p>Both parties agree to keep <em>confidential information</em> secret for five years.</p>', ['Gina Globex', 'Sam Signer'], 'REVIEW');
    mk('Software License', 'Initech', '<h2>Software License</h2><p>Initech is granted a non-exclusive license to use the Software.</p>', ['Ian Initech'], 'DRAFT');
  }

  private now() { return new Date().toISOString(); }
  private log(c: Contract, a: Actor, action: string, detail?: string) {
    const e: AuditEntry = { at: this.now(), actor: a.name, role: a.role, action, detail };
    c.audit.push(e);
    c.updatedAt = e.at;
  }
  private advance(c: Contract, from: Status, to: Status, action: string, a: Actor, detail?: string) {
    c.status = to;
    this.log(c, a, action, detail ?? `${from} -> ${to}`);
  }
  private requireRole(c: Contract, a: Actor) {
    const need = STEP_ROLE[c.status];
    if (!need) throw new BadRequestException(`Contract is ${c.status}; no action available`);
    if (a.role !== need) throw new ForbiddenException(`Current step (${c.status}) requires role ${need}, got ${a.role}`);
  }

  list() {
    return this.contracts.map(({ audit, content, ...rest }) => rest);
  }

  get(id: string): Contract {
    const c = this.contracts.find((x) => x.id === id);
    if (!c) throw new NotFoundException(`Contract ${id} not found`);
    return c;
  }

  create(input: ContractInput, a: Actor): Contract {
    if (!input.title?.trim()) throw new BadRequestException('title is required');
    if (a.role !== 'Drafter') throw new ForbiddenException('Only a Drafter can create contracts');
    const now = this.now();
    const c: Contract = {
      id: `CLM-${String(++this.seq).padStart(3, '0')}`,
      title: input.title.trim(),
      counterparty: input.counterparty?.trim() ?? '',
      content: input.content ?? '',
      status: 'DRAFT',
      signers: (input.signers ?? []).filter((s) => s.trim()).map((name) => ({ name: name.trim() })),
      audit: [],
      createdAt: now,
      updatedAt: now,
    };
    this.log(c, a, 'Created', `Draft "${c.title}" created`);
    this.contracts.push(c);
    return c;
  }

  update(id: string, input: ContractInput, a: Actor): Contract {
    const c = this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('Only drafts can be edited');
    if (a.role !== 'Drafter') throw new ForbiddenException('Only a Drafter can edit drafts');
    if (input.title !== undefined) c.title = input.title.trim() || c.title;
    if (input.counterparty !== undefined) c.counterparty = input.counterparty.trim();
    if (input.content !== undefined) c.content = input.content;
    if (input.signers) c.signers = input.signers.filter((s) => s.trim()).map((name) => ({ name: name.trim() }));
    this.log(c, a, 'Edited', 'Draft updated');
    return c;
  }

  submit(id: string, a: Actor) {
    const c = this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('Only drafts can be submitted');
    this.requireRole(c, a);
    if (!c.signers.length) throw new BadRequestException('Add at least one signer before submitting');
    this.advance(c, 'DRAFT', 'REVIEW', 'Submitted', a);
    return c;
  }

  approve(id: string, a: Actor, comment?: string) {
    const c = this.get(id);
    if (c.status !== 'REVIEW' && c.status !== 'LEGAL') throw new BadRequestException('Contract is not in an approval step');
    this.requireRole(c, a);
    this.advance(c, c.status, NEXT[c.status]!, `Approved by ${a.role}`, a, comment);
    return c;
  }

  reject(id: string, a: Actor, comment?: string) {
    const c = this.get(id);
    if (c.status !== 'REVIEW' && c.status !== 'LEGAL') throw new BadRequestException('Contract is not in an approval step');
    if (!comment?.trim()) throw new BadRequestException('A rejection comment is required');
    this.requireRole(c, a);
    this.advance(c, c.status, 'DRAFT', `Rejected by ${a.role}`, a, comment);
    return c;
  }

  sign(id: string, a: Actor, signature?: string) {
    const c = this.get(id);
    if (c.status !== 'APPROVED') throw new BadRequestException('Contract is not awaiting signatures');
    this.requireRole(c, a);
    const next = c.signers.find((s) => !s.signedAt)!;
    if (signature?.trim().toLowerCase() !== next.name.toLowerCase())
      throw new BadRequestException(`Next signer is "${next.name}"; type that exact name to sign`);
    next.signature = signature.trim();
    next.signedAt = this.now();
    this.log(c, { name: next.name, role: a.role }, 'Signed', `Typed signature "${next.signature}"`);
    if (c.signers.every((s) => s.signedAt)) this.advance(c, 'APPROVED', 'SIGNED', 'Fully executed', a, 'All signers have signed');
    return c;
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Actor, AuditEntry, Comment, Contract, Role, Status } from './models';
import { DiffLine, diffLines, toLines } from './diff';
import { TEMPLATES, fill } from './templates';

/** Workflow: which role may act at each status, and where approval leads. */
const STEP_ROLE: Partial<Record<Status, Role>> = { DRAFT: 'Drafter', REVIEW: 'Reviewer', LEGAL: 'Legal', APPROVED: 'Signer' };
const NEXT: Partial<Record<Status, Status>> = { DRAFT: 'REVIEW', REVIEW: 'LEGAL', LEGAL: 'APPROVED' };

export interface ContractInput {
  title?: string;
  counterparty?: string;
  content?: string;
  signers?: string[];
  endDate?: string | null; // YYYY-MM-DD; null/'' clears
}

const DAY = 86_400_000;
const isoDay = (offsetDays: number) => new Date(Date.now() + offsetDays * DAY).toISOString().slice(0, 10);


@Injectable()
export class ContractsService {
  private contracts: Contract[] = [];
  private seq = 0;

  constructor() {
    const system: Actor = { name: 'Seed', role: 'Drafter' };
    const dana: Actor = { name: 'Dana Drafter', role: 'Drafter' };
    const mk = (title: string, counterparty: string, content: string, signers: string[], status: Status, endDate?: string) => {
      const c = this.create({ title, counterparty, content, signers, endDate }, system);
      if (status !== 'DRAFT') this.advance(c, 'DRAFT', 'REVIEW', 'Submitted for review', dana);
      if (status === 'SIGNED') {
        this.advance(c, 'REVIEW', 'LEGAL', 'Approved by Reviewer', { name: 'Rita Reviewer', role: 'Reviewer' });
        this.advance(c, 'LEGAL', 'APPROVED', 'Approved by Legal', { name: 'Leo Legal', role: 'Legal' });
        for (const s of c.signers) { s.signature = s.name; s.signedAt = this.now(); }
        this.advance(c, 'APPROVED', 'SIGNED', 'Fully executed', dana, 'All signers have signed');
      }
      return c;
    };
    const msa = mk('Master Services Agreement', 'Acme Corp', '<h2>Master Services Agreement</h2><p>This agreement governs the provision of <strong>consulting services</strong> by Provider to Acme Corp.</p><ul><li>Term: 24 months</li><li>Payment: Net 30</li></ul>', ['Alice Acme', 'Bob Provider'], 'DRAFT', isoDay(400));
    this.update(msa.id, { content: '<h2>Master Services Agreement</h2><p>This agreement governs the provision of <strong>consulting services</strong> by Provider to Acme Corp.</p><ul><li>Term: 12 months</li><li>Payment: Net 45</li></ul>' }, dana);
    this.addComment(msa.id, { text: 'Can we shorten the term to 12 months?' }, { name: 'Rita Reviewer', role: 'Reviewer' });
    this.addComment(msa.id, { text: 'Done, and payment moved to Net 45.', parentId: 'c1' }, dana);
    mk('Non-Disclosure Agreement', 'Globex Ltd', '<h2>Mutual NDA</h2><p>Both parties agree to keep <em>confidential information</em> secret for five years.</p>', ['Gina Globex', 'Sam Signer'], 'REVIEW', isoDay(200));
    mk('Software License', 'Initech', '<h2>Software License</h2><p>Initech is granted a non-exclusive license to use the Software.</p>', ['Ian Initech'], 'DRAFT');
    mk('Office Lease', 'Hooli Realty', '<h2>Office Lease</h2><p>Lease of office space, renewable annually.</p>', ['Hank Hooli'], 'SIGNED', isoDay(12));
    mk('Support Contract', 'Umbrella Inc', '<h2>Support Contract</h2><p>24/7 support for the platform.</p>', ['Una Umbrella'], 'SIGNED', isoDay(45));
    mk('Catering Agreement', 'Soylent Foods', '<h2>Catering Agreement</h2><p>Weekly catering for the office.</p>', ['Sol Soylent'], 'SIGNED', isoDay(-20));
  }

  private now() { return new Date().toISOString(); }
  private log(c: Contract, a: Actor, action: string, detail?: string) {
    const e: AuditEntry = { at: this.now(), actor: a.name, role: a.role, action, detail };
    c.audit.push(e);
    c.updatedAt = e.at;
  }
  private saveVersion(c: Contract, a: Actor) {
    c.versions.push({ n: c.versions.length + 1, at: this.now(), author: a.name, title: c.title, content: c.content });
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

  private summary({ audit, content, comments, versions, ...rest }: Contract) {
    return { ...rest, commentCount: comments.length, versionCount: versions.length, daysLeft: this.daysLeft(rest.endDate) };
  }

  /** Whole days from today until endDate (negative = already expired); null if no endDate. */
  private daysLeft(endDate?: string): number | null {
    if (!endDate) return null;
    return Math.round((Date.parse(endDate) - Date.parse(isoDay(0))) / DAY);
  }

  private parseDays(v: unknown, def?: number): number | undefined {
    if (v === undefined || v === '') return def;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0 || n > 3650) throw new BadRequestException('days must be an integer between 0 and 3650');
    return n;
  }

  private checkDate(d?: string | null): string | undefined {
    if (d === undefined || d === null || d === '') return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || isNaN(Date.parse(d)) || new Date(d).toISOString().slice(0, 10) !== d)
      throw new BadRequestException('endDate must be a valid date in YYYY-MM-DD format');
    return d;
  }

  /** Filters: q (title/counterparty/id/content text), status, expiringWithin (days; includes already-expired). */
  list(f: { q?: string; status?: string; expiringWithin?: string } = {}) {
    const statuses: Status[] = ['DRAFT', 'REVIEW', 'LEGAL', 'APPROVED', 'SIGNED'];
    if (f.status && !statuses.includes(f.status as Status)) throw new BadRequestException(`status must be one of ${statuses.join(', ')}`);
    const within = this.parseDays(f.expiringWithin);
    const q = f.q?.trim().toLowerCase();
    return this.contracts
      .filter((c) => !f.status || c.status === f.status)
      .filter((c) => !q || [c.id, c.title, c.counterparty, ...toLines(c.content)].some((t) => t.toLowerCase().includes(q)))
      .filter((c) => within === undefined || (c.endDate !== undefined && this.daysLeft(c.endDate)! <= within))
      .map((c) => this.summary(c));
  }

  renewals(days?: string) {
    const window = this.parseDays(days, 30)!;
    const items = this.contracts
      .filter((c) => c.endDate && this.daysLeft(c.endDate)! <= window)
      .map((c) => ({ ...this.summary(c), state: this.daysLeft(c.endDate)! < 0 ? 'EXPIRED' : 'EXPIRING' }))
      .sort((a, b) => a.daysLeft! - b.daysLeft!);
    return { days: window, today: isoDay(0), items };
  }

  templates() { return TEMPLATES.map(({ content, ...t }) => t); }

  template(id: string) {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) throw new NotFoundException(`Template ${id} not found`);
    return t;
  }

  /** Fill {{placeholders}} of a template; missing values are a 400 listing the missing fields. */
  fillTemplate(id: string, values: Record<string, string> = {}) {
    const t = this.template(id);
    const missing = t.fields.filter((f) => !values?.[f]?.toString().trim());
    if (missing.length) throw new BadRequestException(`Missing template values: ${missing.join(', ')}`);
    const v = Object.fromEntries(Object.entries(values).map(([k, x]) => [k, String(x).trim()]));
    return { templateId: t.id, title: fill(t.title, v), content: fill(t.content, v) };
  }

  addComment(id: string, b: { text?: string; parentId?: string }, a: Actor): Comment {
    const c = this.get(id);
    const text = b?.text?.trim();
    if (!text) throw new BadRequestException('Comment text is required');
    if (text.length > 2000) throw new BadRequestException('Comment is too long (max 2000 characters)');
    let parentId = b.parentId;
    if (parentId) {
      const p = c.comments.find((x) => x.id === parentId);
      if (!p) throw new BadRequestException(`Parent comment ${parentId} not found`);
      parentId = p.parentId ?? p.id; // threads are one level deep: replies attach to the root
    }
    const cm: Comment = { id: `c${c.comments.length + 1}`, parentId, at: this.now(), author: a.name, role: a.role, text };
    c.comments.push(cm);
    this.log(c, a, 'Commented', text.length > 80 ? text.slice(0, 77) + '...' : text);
    return cm;
  }

  versionList(id: string) {
    return this.get(id).versions.map(({ content, ...v }) => v);
  }

  version(id: string, n: string) {
    const v = this.get(id).versions.find((x) => x.n === Number(n));
    if (!v) throw new NotFoundException(`Version ${n} of ${id} not found`);
    return v;
  }

  /** Line diff from version `from` to version `to` ('current' = live content, default). */
  diff(id: string, from?: string, to = 'current') {
    if (!from) throw new BadRequestException('from (version number) is required');
    const c = this.get(id);
    const a = this.version(id, from);
    const bContent = to === 'current' ? c.content : this.version(id, to).content;
    const lines: DiffLine[] = diffLines(toLines(a.content), toLines(bContent));
    return {
      from: a.n, to: to === 'current' ? 'current' : Number(to), lines,
      added: lines.filter((l) => l.type === 'add').length, removed: lines.filter((l) => l.type === 'del').length,
    };
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
      endDate: this.checkDate(input.endDate),
      signers: (input.signers ?? []).filter((s) => s.trim()).map((name) => ({ name: name.trim() })),
      audit: [],
      comments: [],
      versions: [],
      createdAt: now,
      updatedAt: now,
    };
    this.log(c, a, 'Created', `Draft "${c.title}" created`);
    this.saveVersion(c, a);
    this.contracts.push(c);
    return c;
  }

  update(id: string, input: ContractInput, a: Actor): Contract {
    const c = this.get(id);
    if (c.status !== 'DRAFT') throw new BadRequestException('Only drafts can be edited');
    if (a.role !== 'Drafter') throw new ForbiddenException('Only a Drafter can edit drafts');
    const endDate = input.endDate === undefined ? c.endDate : this.checkDate(input.endDate);
    if (input.title !== undefined) c.title = input.title.trim() || c.title;
    if (input.counterparty !== undefined) c.counterparty = input.counterparty.trim();
    if (input.content !== undefined) c.content = input.content;
    if (input.signers) c.signers = input.signers.filter((s) => s.trim()).map((name) => ({ name: name.trim() }));
    c.endDate = endDate;
    this.saveVersion(c, a);
    this.log(c, a, 'Edited', `Draft updated (saved as version ${c.versions.length})`);
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

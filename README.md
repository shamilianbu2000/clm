# CLM - Contract Lifecycle & Compliance Management

A small full-stack demo of a contract lifecycle workflow: draft contracts in a rich-text editor, push them through a sequential multi-party approval chain, collect ordered e-signatures, and keep a full audit trail.

**Stack:** Vue 3 + Vite + TypeScript + Tiptap (frontend), NestJS + TypeScript (backend).
**No database and no external auth:** all data is seeded and held in memory inside the NestJS service. **Data resets on every backend restart.**

## Workflow

```
DRAFT --(Drafter submits)--> REVIEW --(Reviewer approves)--> LEGAL --(Legal approves)--> APPROVED --(each Signer signs in order)--> SIGNED
   ^                            |                                |
   +------ reject (comment required) ---------------------------+
```

- Only the role that owns the current step can act (enforced server-side, 403 otherwise).
- Role-based access is mocked with a role switcher in the header (Drafter / Reviewer / Legal / Signer). The frontend sends `x-role` and `x-user` headers.
- E-signature: signers sign in the listed order by typing their exact name.
- Every action (create, edit, submit, approve, reject, sign, execute) is recorded in the contract's audit trail (who / what / when).

## Run

Requires Node 20+.

```bash
npm run install:all
npm run start:backend    # http://localhost:3001/api
npm run start:frontend   # http://localhost:5173  (proxies /api to :3001)
```

Open http://localhost:5173, then switch roles in the header to walk a contract through the workflow. `npm run build` compiles both apps.

## API

Base URL `http://localhost:3001/api`. Identity headers: `x-role` (required: `Drafter|Reviewer|Legal|Signer`) and `x-user` (optional display name).

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/contracts` | any | List contracts (summaries) |
| GET | `/contracts/:id` | any | Contract with content, signers and audit |
| GET | `/contracts/:id/audit` | any | Audit trail |
| POST | `/contracts` | Drafter | Create draft `{title, counterparty, content, signers[]}` |
| PUT | `/contracts/:id` | Drafter | Edit a draft |
| POST | `/contracts/:id/submit` | Drafter | DRAFT -> REVIEW |
| POST | `/contracts/:id/approve` | Reviewer / Legal (current step) | Advance; body `{comment?}` |
| POST | `/contracts/:id/reject` | Reviewer / Legal (current step) | Back to DRAFT; body `{comment}` required |
| POST | `/contracts/:id/sign` | Signer | Sign as next signer; body `{signature}` must equal their name |

## Structure

```
backend/   NestJS API (src/contracts.service.ts holds seed data + workflow rules)
frontend/  Vue 3 app (src/components: list, detail/workflow, editor, Tiptap wrapper)
```

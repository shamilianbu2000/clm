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

## Features

- Rich-text contract drafting with a multi-party approval chain, ordered e-signatures and an audit trail (see Workflow).
- **Templates:** seeded NDA, Service Agreement and Employment Offer with `{{placeholder}}` fields. "New from template" in the editor asks for the values and fills title and text.
- **Comments:** simple threaded comments (replies attach to a top-level comment) by the current role/user, shown in the detail view and logged in the audit trail.
- **Version history:** every draft save creates a version; the detail view lists versions and shows a line-based diff (green added, red removed) between any version and the current text.
- **Expiry & renewals:** contracts have an optional `endDate`. A Renewals panel lists contracts expiring within N days (configurable, default 30) and flags expired ones. Seed data includes an expired contract, one expiring in 12 days and one in 45.
- **Search & filters:** text search (id, title, counterparty, body), status filter and an "expiring soon" toggle on the contract list.

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
| GET | `/contracts` | any | List contracts (summaries). Optional query: `q` (text), `status`, `expiringWithin` (days; includes expired) |
| GET | `/contracts/renewals?days=30` | any | Contracts with `endDate` within `days` (0-3650) or already past; each has `daysLeft` and `state` `EXPIRING`/`EXPIRED` |
| GET | `/contracts/:id` | any | Contract with content, signers and audit |
| GET | `/contracts/:id/audit` | any | Audit trail |
| POST | `/contracts` | Drafter | Create draft `{title, counterparty, content, signers[], endDate?}` (`endDate` is `YYYY-MM-DD`) |
| PUT | `/contracts/:id` | Drafter | Edit a draft (saves a new version) |
| POST | `/contracts/:id/submit` | Drafter | DRAFT -> REVIEW |
| POST | `/contracts/:id/approve` | Reviewer / Legal (current step) | Advance; body `{comment?}` |
| POST | `/contracts/:id/reject` | Reviewer / Legal (current step) | Back to DRAFT; body `{comment}` required |
| POST | `/contracts/:id/sign` | Signer | Sign as next signer; body `{signature}` must equal their name |
| GET | `/contracts/:id/comments` | any | List comments |
| POST | `/contracts/:id/comments` | any | Add comment `{text, parentId?}` (logged in audit) |
| GET | `/contracts/:id/versions` | any | Version list (without content) |
| GET | `/contracts/:id/versions/:n` | any | One version with content |
| GET | `/contracts/:id/diff?from=n&to=m` | any | Line diff from version `n` to version `m` (`to` defaults to `current`) |
| GET | `/templates` | any | List templates and their placeholder `fields` |
| GET | `/templates/:id` | any | One template with content (404 if unknown) |
| POST | `/templates/:id/fill` | any | Body `{values:{party:"..."}}`; returns filled `{title, content}`; 400 listing missing fields |

## Structure

```
backend/   NestJS API (src/contracts.service.ts holds seed data + workflow rules; templates.ts, diff.ts)
frontend/  Vue 3 app (src/components: list, detail/workflow, editor, Tiptap wrapper)
```

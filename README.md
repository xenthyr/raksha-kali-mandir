# শ্রী শ্রী মা রক্ষা কালী মন্দির

**Sri Sri Maa Raksha Kali Mandir**

The official repository for the controlled V1.1.3 reconstruction of the digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

This repository is being rebuilt from the project's approved canonical production-update artifacts and the controlled repository build specification. The V1.1.3 target is a clean-slate reconstruction. It is not a restoration of the previous application implementation.

---

## 1. Repository Status

| Item | Value |
|---|---|
| Project | Sri Sri Maa Raksha Kali Mandir |
| Bengali name | `শ্রী শ্রী মা রক্ষা কালী মন্দির` |
| English name | `Sri Sri Maa Raksha Kali Mandir` |
| Application target | `1.1.3` |
| Repository | `https://github.com/xenthyr/raksha-kali-mandir` |
| Primary public language | Bengali |
| Default locale | `bn-IN` |
| Business timezone | `Asia/Kolkata` |
| Build model | Clean-slate controlled reconstruction |

The repository is developed in controlled batches. Each batch has an exact file allowlist, contract families, dependencies, source requirements, validation requirements, stop conditions, and commit guidance.

A green batch is a batch-level result. It is not, by itself, a declaration of production readiness.

---

## 2. Source of Truth and Precedence

For factual project information, use this precedence:

1. **V1.1.3 Unified Canonical Blueprint**
2. **V2.1 Canonical Source-Data Overlay**
3. **1433 Panjika Canonical Data**
4. **Implementation inference only when the canonical sources do not specify the required implementation detail**

The repository must preserve the distinction between source material, canonical data, derived values, runtime configuration, publication state, and presentation.

Older source copies, legacy application code, historical deployments, and obsolete configuration must not silently override the current canonical production-update sources.

When a source does not establish a fact, preserve an explicit state such as `UNKNOWN`, `TO_VERIFY`, or `HISTORICAL` rather than manufacturing a value.

---

## 3. Canonical Temple Identity

The current canonical temple identity is:

| Identifier | Value |
|---|---|
| Temple ID | `TEMPLE-0001` |
| Official Bengali name | `শ্রী শ্রী মা রক্ষা কালী মন্দির` |
| Official English name | `Sri Sri Maa Raksha Kali Mandir` |
| Deity ID | `DEITY-0001` |
| Deity | `মা রক্ষা কালী` |
| Location ID | `LOCATION-0001` |
| Physical location | `সাহাপুর বটতলা মোড়` |
| Latitude | `25.661726` |
| Longitude | `88.103574` |
| Business timezone | `Asia/Kolkata` |

Canonical IDs are identities, not display values. They must not be regenerated from filenames, array order, names, role labels, or UI state.

---

## 4. Canonical Committee Mapping

The current canonical committee mapping is:

| Person ID | Person | Canonical role |
|---|---|---|
| `PERSON-000006` | `বিপ্লব সরকার / Biplab Sarkar` | `ROLE-EXECUTIVE-MEMBER` |
| `PERSON-000007` | `মিন্টু শীল / Mintu Shil` | `ROLE-ORGANIZING-SECRETARY` |
| `PERSON-000008` | `জয়ন্ত দে সরকার / Jayanta Dey Sarkar` | `ROLE-ASSISTANT-SECRETARY` |

These role mappings are canonical project data. Documentation, authorization logic, UI text, tests, and administrative workflows must not silently change them.

Future committee changes must use the governed canonical-data, approval, provenance, revision, and audit workflow.

---

## 5. Panjika Baseline

The current canonical 1433 Panjika baseline is:

| Field | Value |
|---|---|
| Panjika ID | `PANJIKA-Y1433` |
| Calendar system | Bisuddha Siddhanta |
| Calculation version | `CALC-BS1433-RAIGANJ-V1` |
| Calculation basis | Raiganj regional calculation basis |
| Operational start | `2026-09-11` |
| Operational end | `2027-04-14` |
| Expected/actual daily records | `216` |
| Timezone | `Asia/Kolkata` |
| Daily calculation status | `CANONICAL_REGIONAL_CALCULATION` |

The temple physical coordinates and the Panjika calculation basis are separate concepts.

The physical temple coordinates identify `LOCATION-0001`. They do not replace the approved Raiganj regional calculation basis.

The 216 supplied daily astronomical records must not be silently recalculated or mutated because the temple coordinates are known.

The production-update correction changes the stale daily calculation-status metadata to `CANONICAL_REGIONAL_CALCULATION` while preserving the supplied astronomical values.

The canonical data rules further require:

- first daily record: `2026-09-11`;
- last daily record: `2027-04-14`;
- unique daily IDs;
- unique Gregorian dates;
- unchanged astronomical values;
- unchanged calculation version.

---

## 6. Temple Operating Baseline

The canonical operating baseline is:

| Property | Canonical value |
|---|---|
| Daily operation | `DAILY_MORNING_TO_NIGHT` |
| Fixed daily puja | `NONE` |
| Devotee-initiated puja | `ALLOWED/ACTUAL` |
| Amavasya puja | `RECURRING_REQUIRED` |
| Special puja timing | `EVENT_RUNTIME` |

The site must not fabricate a fixed daily puja timetable.

Special puja times are runtime/admin-managed information and must remain runtime data when the source design requires it.

The temple's own observance is distinct from a generic festival listing. A generic festival must not be presented as a temple-official observance without an applicable temple observance record.

---

## 7. Public Language and Editorial Policy

The public experience is Bengali-first.

Use Bengali for public-facing:

- navigation;
- temple information;
- puja and devotional content;
- public notices;
- support and grievance messaging;
- public state labels;
- user guidance;
- error messaging where practical.

Use English where required for:

- canonical IDs;
- technical identifiers;
- URLs;
- source IDs;
- configuration names;
- database/schema names;
- API fields;
- source code;
- technical documentation;
- explicit translations.

The public interface should remain clear rather than mixing languages solely for implementation convenience.

---

## 8. System Architecture

The controlled architecture is:

```text
Source
  ↓
Canonical Data
  ↓
Normalization
  ↓
Validation
  ↓
Query / Read Model
  ↓
Deterministic Engines
  ↓
View Models
  ↓
UI
```

Administrative mutation follows the governed direction:

```text
Admin input
  ↓
Validation
  ↓
Workflow / Approval
  ↓
Canonical persistence
  ↓
Revision / Audit
  ↓
Publication / Revalidation
```

AI is an additional interface above the same query/read-model/deterministic-engine layer.

AI is never the source of truth.

The rule is:

> One fact → one canonical record → many derived experiences.

No page or component should hardcode canonical tithi, festival, committee, location, donation, support-state, or other mutable project facts.

---

## 9. Repository Layering

The intended separation is:

```text
UI
  ↓
View Model / Application Layer
  ↓
Query / Service Layer
  ↓
Repository
  ↓
D1
```

Client components must not directly execute D1 SQL.

Repositories and services are the appropriate place for:

- data access;
- validation boundaries;
- authorization boundaries;
- deterministic transformations;
- error handling;
- observability;
- domain rules.

This separation is especially important for security-sensitive, canonical-data-sensitive, and stateful operations.

---

## 10. Canonical Data Governance

Every material source-derived entity must retain the identity and traceability required by its domain, including where applicable:

- stable canonical ID;
- source reference;
- provenance;
- verification state;
- revision history;
- publication state;
- audit linkage.

Public serializers must be explicit allow-lists.

Private fields must not be returned and filtered afterward.

A draft is not automatically published.

An upload is not automatically public.

An administrative record is not automatically a public record.

---

## 11. Public / Private Boundary

### Public

Publicly serialized data may include only information explicitly permitted for publication, such as approved:

- temple information;
- deity information;
- public committee information;
- public notices;
- calendar information;
- public puja information;
- approved media;
- approved documents;
- public aggregate support information.

### Private

Private data may include:

- authentication data;
- sessions;
- password material;
- recovery information;
- private committee information;
- private phone/email information;
- private support-ticket data;
- internal notes;
- assignments;
- risk flags;
- private attachments;
- donor-sensitive information;
- audit information;
- infrastructure credentials;
- object-storage credentials;
- email provider credentials;
- AI provider credentials.

Private data must remain unavailable to:

- public routes;
- public API serializers;
- public search;
- public AI grounding;
- client-side bundles;
- uncontrolled object URLs.

---

## 12. Authentication

Administrative authentication is restricted to canonical committee identities and the approved account lifecycle.

The approved model includes:

- username or registered phone;
- password;
- first-login temporary credential setup;
- phone binding/confirmation;
- optional recovery email;
- private password establishment;
- server-managed sessions;
- secure cookie controls;
- explicit account disable/revocation;
- password-reset controls;
- reauthentication for high-risk actions where required.

Public signup, social login, and Google OAuth are not administrative authentication mechanisms for this target.

One implemented, versioned password-KDF policy must be used rather than describing multiple unimplemented algorithms.

---

## 13. Authorization and Governance

Authorization is resolved conceptually as:

```text
USER
  ↓
ACTIVE ROLES
  ↓
PERMISSIONS
  ↓
RESOURCE / SCOPE CHECK
  ↓
POLICY CHECK
  ↓
AUDIT
```

A user may hold multiple approved roles.

A role is a permission bundle, not an exclusive identity.

Server-side permission checks are authoritative.

Hidden buttons, disabled controls, route visibility, or client state are not authorization.

Administrative mutations must verify the current actor and permission at the server boundary.

Finance-sensitive mutations must also respect their workflow state.

---

## 14. Approval and State Governance

Editorial content follows the governed publication pattern:

```text
DRAFT
  ↓
IN_REVIEW
  ↓
APPROVED
  ↓
PUBLISHED
  ↓
ARCHIVED
```

Financial records follow:

```text
ENTERED
  ↓
PENDING_VERIFICATION
  ↓
VERIFIED
  ↓
APPROVED
  ↓
POSTED
```

Critical identity/governance changes follow:

```text
DRAFT
  ↓
REVIEW
  ↓
APPROVED
  ↓
EFFECTIVE
  ↓
HISTORICAL
```

Every state transition must preserve the actor, timestamp, previous state, new state, and optional reason where the relevant domain contract requires it.

---

## 15. Donation Baseline

The canonical donation configuration is:

| Field | Value |
|---|---|
| Configuration ID | `DONATION-CONFIG-0001` |
| VPA | `7583992377@okbizaxis` |
| Payee | `Sri Sri Raksha Kali Mandir` |
| Minimum amount | `₹11` |
| Suggested amount | `₹51` |
| Suggested amount | `₹101` |
| Suggested amount | `₹501` |
| Suggested amount | `₹1001` |
| Transaction note | `শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী` |

A submitted UTR is not payment verification.

Donation intent, submitted payment reference, verification, approval, and posting are separate workflow concepts.

Finance permissions remain separate from ordinary content-publishing permissions.

---

## 16. Support and Grievance

Public support surfaces include:

```text
/contact
/grievance
/track-ticket
```

Administrative support surfaces include:

```text
/admin/inbox
/admin/inbox/[ticketId]
```

Ticket references use:

```text
MRK-YYYY-NNNNNN
```

Tracking requires:

```text
ticket reference + 4-digit PIN
```

The reference alone is never authorization for private ticket information.

Support categories are:

```text
FINANCE
PUJA
GRIEVANCE
GENERAL
```

Internal states are:

```text
OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
REJECTED
CLOSED
```

Public Bengali status labels include:

```text
পর্যালোচনাধীন
প্রক্রিয়াধীন
মীমাংসিত
```

Ticket references must be collision-safe through D1-backed creation.

Tracking PINs must never be stored plaintext.

Public tracking must be rate-limited and designed to resist brute-force discovery.

Internal notes, assignments, risk flags, private attachments, identity hashes, and other private fields must never be serialized to public tracking.

---

## 17. Attachment and Upload Policy

Server enforcement is authoritative.

### Public grievance

| Limit | Value |
|---|---|
| Maximum files | `3` |
| Maximum per file | `5 MB` |
| Maximum aggregate | `10 MB` |
| Allowed | JPEG / PNG / WebP / PDF |
| Video | Disabled |

### Committee photographs

| Limit | Value |
|---|---|
| Maximum files per upload | `10` |
| Maximum per file | `5 MB` |
| Maximum aggregate | `50 MB` |

### Committee videos

| Limit | Value |
|---|---|
| Maximum files per upload | `2` |
| Maximum per file | `50 MB` |
| Maximum aggregate | `100 MB` |

### Committee audio

| Limit | Value |
|---|---|
| Maximum files per upload | `2` |
| Maximum per file | `25 MB` |

### Committee documents

| Limit | Value |
|---|---|
| Maximum files per upload | `5` |
| Maximum per file | `15 MB` |

The enforcement path is:

```text
UI
  ↓
API authorization
  ↓
Upload issuance
  ↓
Object finalization
  ↓
Worker / reconciliation
```

A UI-only limit is not sufficient.

---

## 18. Object Storage

The production object-store target is **Backblaze B2**.

| Field | Value |
|---|---|
| Provider | Backblaze B2 |
| Bucket | `raksha-kali-mandir-storage` |
| Bucket ID | `48a58aafc4e2931aaf030011` |
| Region | `eu-central-003` |
| S3 endpoint | `https://s3.eu-central-003.backblazeb2.com` |
| Access model | Private |
| Credentials | Server-side only |

Private attachments remain private.

Presigned or temporary object access must be short-lived, scoped, and treated as bearer credentials.

The current V1.1.3 production target must not reintroduce executable Cloudflare R2 storage paths. Historical R2 references in older blueprint material are treated as superseded for this target.

---

## 19. Email

The project uses a Resend adapter.

Operational mailboxes currently supplied by the source configuration are:

```text
Primary: maarakshakalisahapur@gmail.com
Backup:  maarakshakalisahapur@gmail.com
```

Because the supplied primary and backup addresses are identical, the application must not interpret them as two different destinations and send duplicate copies.

Production sending requires an appropriately verified sender domain.

The `pages.dev` hosting domain must not be assumed to be a valid Resend sender domain.

Email lifecycle states include:

```text
QUEUED
SENT
DELIVERED
FAILED
BOUNCED
COMPLAINT
```

Provider-supported engagement states may include:

```text
OPENED
CLICKED
```

Webhook authenticity must be verified.

Webhook handling must be safe against replay, duplication, and out-of-order provider events.

A failed email delivery must not erase or roll back the durable support-ticket state.

Development and preview environments must not accidentally send production mail.

---

## 20. Search and AI

Search indexes only appropriate public, approved content.

AI grounding uses the same governed read layer.

AI must respect:

- publication state;
- verification state;
- provenance;
- historical labeling;
- public/private boundaries;
- authorization boundaries.

AI must not create a parallel canonical database.

AI must not mutate canonical data through ordinary public conversation.

The site must remain useful when AI is unavailable.

---

## 21. PWA and Caching

The PWA layer may cache only safe public resources.

It must not cache:

- private support-ticket responses;
- administrative pages;
- authenticated API payloads;
- private attachments;
- sessions;
- secrets;
- private user information.

Offline behavior must not bypass server authorization or cause protected data to persist in unsafe client storage.

---

## 22. Accessibility

The target accessibility standard is **WCAG 2.2 AA**.

The implementation should provide:

- semantic HTML;
- keyboard navigation;
- visible focus;
- focus that is not obscured;
- adequately sized touch targets;
- accessible authentication;
- labelled form controls;
- screen-reader-friendly dialogs;
- caption/transcript support where applicable;
- reduced-motion support;
- sufficient contrast;
- language attributes;
- logical heading hierarchy;
- accessible errors;
- no status meaning conveyed only by color.

Accessibility is part of the implementation definition of done, not a decorative post-processing step.

---

## 23. UI and Brand Principles

The public visual language is:

- Bengali-first;
- warm;
- calm;
- respectful;
- devotional;
- accessible;
- responsive;
- restrained.

The design should avoid:

- blanket gradients;
- glassmorphism as a default visual pattern;
- excessive shadows;
- decorative clutter;
- unnecessary animation;
- inaccessible interactions.

Motion should be subtle and respect `prefers-reduced-motion`.

The homepage is a curated public experience rather than an administrative dashboard dump.

The assistant/AI experience is supplementary to the public site.

Branding must not manufacture a historical seal, government-style seal, or falsely historical emblem.

The current logo/official-seal approval state remains `DESIGN_RUNTIME` until the approved asset state is explicitly established.

---

## 24. Time and Scheduling

Business-date interpretation uses:

```text
Asia/Kolkata
```

Use UTC for persisted instants where appropriate.

Convert explicitly to `Asia/Kolkata` for business-time rendering and scheduling.

Scheduled jobs must be safe to retry.

A scheduled worker touching canonical data must be idempotent and safe to run twice.

For the canonical midnight-IST scheduling rule, midnight IST corresponds to `18:30 UTC` on the preceding UTC date.

The project build specification represents that schedule as:

```text
30 18 * * *
```

when the job is intentionally scheduled at midnight IST.

---

## 25. Environment Separation

Preview and production resources are separate.

The production target uses:

```text
Cloudflare Worker / OpenNext runtime
Cloudflare D1
Cloudflare KV
Backblaze B2
Resend
```

Preview must not mutate production.

Production secrets must never be committed to Git.

Client bundles must not contain:

- database credentials;
- B2 credentials;
- Resend keys;
- authentication secrets;
- AI provider secrets;
- reset secrets;
- server-only configuration.

---

## 26. Development Toolchain

The repository uses:

- Node.js `24.18.x`;
- npm `11.19.1`;
- Next.js `15.5.x`;
- TypeScript;
- OpenNext for Cloudflare;
- Wrangler for Cloudflare tooling;
- ESLint;
- Prettier;
- Vitest;
- Playwright.

The committed `package-lock.json` is part of the reproducible dependency graph.

Dependency upgrades must be evaluated for runtime, framework, security, and deployment compatibility.

---

## 27. Development on Android / Termux

Git and repository editing can be performed directly from Android/Termux.

Some Linux-specific build/runtime tooling used by Next.js/OpenNext/Cloudflare may require a Linux userland through `proot-distro`/Ubuntu on Android.

The repository architecture must not be altered merely to accommodate an Android-native binary limitation.

The supported repository runtime remains the controlled Node.js/Linux-compatible environment used by the project tooling.

---

## 28. Local Development Commands

Typical commands include:

```bash
npm install
npm run dev
npm run build
npm run start
npm run preview
npm run deploy

npm run lint
npm run typecheck
npm test
npm run test:e2e

npm run check
npm run format
npm run format:check
```

The exact command behavior is controlled by the repository's package scripts and runtime configuration.

---

## 29. Clean-Slate Rule

This repository is intentionally being reconstructed from a clean baseline.

Do not restore:

- legacy pages;
- legacy components;
- legacy APIs;
- legacy database implementations;
- legacy storage implementations;
- legacy authentication implementations;
- legacy deployment configuration;
- legacy source-of-truth copies.

Do not revive previous application code from Git history, branches, local backups, or old deployments.

Only files created by approved batches and permitted generated artifacts belong in the reconstructed repository.

---

## 30. Controlled Batch Model

Every batch has:

- exact file allowlist;
- contract families;
- dependencies;
- source requirements;
- security classification;
- implementation requirements;
- validation requirements;
- stop conditions;
- commit guidance.

A batch is incomplete if an allowlisted file is missing.

A missing dependency is a sequencing issue, not permission to invent a parallel implementation.

The repository should prefer small, deterministic, typed modules and explicit interfaces.

---

## 31. Current Foundation Batches

### Batch 001 — Foundation / Config

```text
.env.example
.gitignore
package.json
package-lock.json
```

### Batch 002 — Foundation / Config

```text
tsconfig.json
next.config.ts
open-next.config.ts
wrangler.toml
```

### Batch 003 — Foundation / Config

```text
eslint.config.mjs
prettier.config.mjs
vitest.config.ts
playwright.config.ts
```

### Batch 004 — Foundation / Config

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

The clean-slate repository manifest contains 538 controlled files across the complete build sequence.

---

## 32. Validation and Quality

Every batch must validate the complete batch scope.

Where applicable, validation includes:

- exact path existence;
- syntax;
- typechecking;
- linting;
- formatting;
- unit tests;
- integration tests;
- end-to-end tests;
- accessibility checks;
- security checks;
- canonical-data validation;
- Panjika validation;
- static repository scans;
- dependency integrity;
- build/runtime compatibility.

The repository must report what was actually run.

It must not claim a check passed when the check was not executed.

Warnings must not be silently converted into assertions of success.

---

## 33. Error Handling

Errors should be structured and observable.

Do not silently swallow:

- database failures;
- validation failures;
- authorization failures;
- authentication failures;
- storage failures;
- email failures;
- webhook failures;
- scheduled-job failures;
- state-machine violations.

Public error messages should avoid unnecessary internal implementation details.

Internal diagnostics must not leak secrets or protected user data.

---

## 34. Git Discipline

Before beginning a controlled batch:

```bash
git status --short
git fetch origin
git log -1 --oneline --decorate
git log -1 --oneline --decorate origin/main
git rev-list --left-right --count main...origin/main
```

A controlled batch should begin from a clean and reconciled repository state.

Before committing:

```bash
git status --short
git diff --check
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Commit only the files owned by the current batch, plus explicitly permitted direct integration changes.

---

## 35. Commit Convention

Controlled batch commits use:

```text
batch-XX: <domain>
```

For Batch 004:

```text
batch-004: foundation-config
```

Do not mix unrelated work into a batch commit.

---

## 36. Contract Governance

The foundation/configuration documentation is governed by:

```text
CTR-00001–CTR-00100  FOUNDATION
CTR-00101–CTR-00200  PRODUCT
CTR-06701–CTR-06800  CONFIG
```

The broader system is governed by additional contract families covering areas including:

- public information;
- navigation;
- temple data;
- history;
- committee;
- governance;
- RBAC;
- authentication;
- Panjika;
- Amavasya;
- puja;
- festivals;
- status;
- Jaba;
- Sankalp;
- seva;
- finance;
- support;
- email;
- upload/storage;
- search;
- AI;
- notifications;
- PWA;
- SEO;
- sharing;
- accessibility;
- deployment;
- security;
- privacy;
- legal;
- operations;
- backup.

A contract is complete only when its required implementation, test coverage, failure semantics, authorization, provenance, observability, and documentation are present for its owning batch.

---

## 37. No Silent Drift

These values must not silently drift:

```text
TEMPLE-0001
DEITY-0001
LOCATION-0001
25.661726 / 88.103574
Asia/Kolkata

PERSON-000006 → ROLE-EXECUTIVE-MEMBER
PERSON-000007 → ROLE-ORGANIZING-SECRETARY
PERSON-000008 → ROLE-ASSISTANT-SECRETARY

PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records

DONATION-CONFIG-0001
7583992377@okbizaxis
MRK-YYYY-NNNNNN

Backblaze B2
raksha-kali-mandir-storage
```

A material source revision must be handled as a governed revision rather than silently changed inside application code.

---

## 38. Production Acceptance Boundary

The repository is not production-ready until the complete production preflight is green, or an explicit recorded exception exists with appropriate ownership, date, scope, risk, and reason.

The final production gate includes, where applicable:

1. tree completeness;
2. canonical-source hash validation;
3. canonical-ID uniqueness;
4. clean D1 migration;
5. D1 repository/query integration;
6. authentication/session/RBAC;
7. donation state machine;
8. support-ticket lifecycle;
9. attachment quota/security;
10. private B2 isolation;
11. sender-domain verification;
12. email webhook integrity;
13. Panjika 216-row integrity;
14. public route rendering/build;
15. admin route authorization;
16. search publication filtering;
17. AI grounding/publication exclusion;
18. PWA install/update/offline behavior;
19. SEO, robots, sitemap and Open Graph;
20. accessibility;
21. responsive mobile journeys;
22. unit/integration/E2E/security suites;
23. backup/restore verification;
24. release/rollback validation.

A failed production gate must be fixed or explicitly recorded as an exception. It must not be hidden behind a prose claim that the failure is "acceptable."

---

## 39. Repository Documentation Map

The controlled documentation set grows with the batch plan.

Planned documentation includes:

```text
docs/
├── architecture/README.md
├── contracts/MASTER-CONTRACTS.txt
├── data-model/ERD.md
├── admin/
│   ├── ADMIN-ONBOARDING.md
│   └── COMMITTEE-LOGIN.md
├── governance/
│   ├── COMMITTEE-RBAC.md
│   └── PUBLICATION-GOVERNANCE.md
├── calendar/
│   └── PANJIKA-GOVERNANCE.md
├── media/
│   ├── MEDIA-POLICY.md
│   ├── MEDIA-UPLOAD-LIMITS.md
│   └── MUSIC-LIBRARY.md
├── seva/
│   └── JABA-SYSTEM.md
├── finance/
│   └── DONATION-RECONCILIATION.md
├── documents/
│   └── DOCUMENT-MANAGEMENT.md
├── support/
│   ├── SUPPORT-SYSTEM.md
│   ├── TICKET-LIFECYCLE.md
│   ├── ATTACHMENT-POLICY.md
│   └── EMAIL-DISPATCH.md
├── storage/
│   └── BACKBLAZE-B2.md
├── security/
│   └── SECURITY-MODEL.md
├── deployment/
│   └── DEPLOYMENT-RUNBOOK.md
├── operations/
│   └── INCIDENT-RUNBOOK.md
├── branding/
│   └── BRAND-SYSTEM.md
└── adr/
    ├── ADR-0001-canonical-data.md
    ├── ADR-0002-backblaze-b2-storage.md
    ├── ADR-0003-support-ticketing.md
    └── ADR-0004-email-outbox.md
```

Those files are owned by later documentation batches and are not substitutes for the Batch 004 root policies.

---

## 40. Repository Source Artifacts

The current source basis includes:

- V1.1.3 unified canonical blueprint;
- V2.1 final canonical source data;
- 1433 current Panjika canonical data;
- controlled repository build batch prompt pack;
- controlled 538-file clean-slate manifest.

The canonical production-update hashes currently associated with the supplied artifacts are:

### V1.1.3 blueprint

```text
1e02b41c91a0e2fcfc072af2f01836fd59780d73bef0f28ee502d00331a86e8d
```

### V2.1 canonical source data

```text
fc0f3f0c6ba27075035d77238f01793842cc405c82ca240c50fbfff2237e13dc
```

### 1433 Panjika

```text
6dc5cf755cb2f54a9884aa50c1d2cd486052d679054e3a9f31350e34e87be246
```

These hashes identify the source artifact versions used for this controlled reconstruction.

---

## 41. License and Reuse

This Batch 004 documentation set does not introduce a repository-wide open-source license.

Do not infer permission to reproduce, redistribute, modify, or commercially reuse project-specific repository content solely because a license file is absent.

Third-party dependencies remain subject to their own licenses.

Project-specific source data, media, branding, documents, and other content remain subject to their applicable ownership and usage restrictions.

---

## 42. Repository URLs

GitHub repository:

```text
https://github.com/xenthyr/raksha-kali-mandir
```

Legacy/public hosting reference:

```text
https://maarakshakali.pages.dev
```

The legacy Pages deployment is not the clean-slate Worker runtime source of truth.

Project maps reference:

```text
https://maps.app.goo.gl/AwerSG1peoGm2gUx9
```

Project WhatsApp group:

```text
https://chat.whatsapp.com/IRoYErTIKYF4Qr2bPl8FMX
```

These URLs are project references. Their presence in this README does not imply that every linked service is an application source of truth.

---

## 43. Final Engineering Principles

The repository follows these principles:

1. Canonical data before presentation.
2. One fact, one canonical record.
3. Explicit provenance and revision.
4. Server-side authorization.
5. Public/private separation.
6. Runtime configuration remains runtime configuration.
7. Deterministic business logic.
8. Explicit lifecycle/state transitions.
9. Idempotent retryable mutations.
10. Bengali-first public experience.
11. `Asia/Kolkata` for business-time semantics.
12. No silent canonical drift.
13. No legacy restoration.
14. No secrets in Git.
15. No direct UI-to-D1 SQL.
16. No uncontrolled public object access.
17. No fabricated historical or temple-official facts.
18. AI is not a source of truth.
19. Validate before committing.
20. Report only checks actually performed.
21. Do not declare production readiness before the final release gates pass.

---

## 44. Final Repository Identity

```text
TEMPLE-0001
শ্রী শ্রী মা রক্ষা কালী মন্দির

DEITY-0001
মা রক্ষা কালী

LOCATION-0001
সাহাপুর বটতলা মোড়
25.661726, 88.103574
Asia/Kolkata

PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
```

The repository exists to provide a trustworthy, secure, maintainable, Bengali-first digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

Its success criterion is not merely that a website renders.

The system must preserve canonical truth, provenance, authorization, privacy, deterministic behavior, operational safety, accessibility, and controlled deployment throughout the complete repository lifecycle.

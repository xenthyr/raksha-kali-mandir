# শ্রী শ্রী মা রক্ষা কালী মন্দির

**Sri Sri Maa Raksha Kali Mandir**

The official repository for the controlled V1.1.3 clean-slate reconstruction of the digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

This repository is rebuilt from the current approved canonical production-update artifacts and the controlled V1.1.3 repository build specification. It is not a restoration of the previous application implementation.

---

## 1. Repository Status

| Item | Value |
|---|---|
| Project | Sri Sri Maa Raksha Kali Mandir |
| Bengali name | `শ্রী শ্রী মা রক্ষা কালী মন্দির` |
| English name | `Sri Sri Maa Raksha Kali Mandir` |
| Application target | `1.1.3` |
| Repository | `https://github.com/xenthyr/raksha-kali-mandir` |
| Public language | Bengali-first |
| Default locale | `bn-IN` |
| Business timezone | `Asia/Kolkata` |
| Reconstruction mode | Clean-slate controlled build |
| Controlled repository scope | 538 files |

A batch result is a batch-level result. It must not be represented as final production readiness unless the complete production acceptance gate has passed.

---

## 2. Source Authority and Precedence

For factual project information, use this order:

1. **V1.1.3 Unified Canonical Blueprint**
2. **V2.1 Canonical Source-Data Overlay**
3. **1433 Panjika Canonical Data**
4. **Implementation inference only where the canonical sources do not specify the required implementation detail**

The current production-update source data explicitly identifies the current committee roster as **ALL USER-CONFIRMED** and states that the current roster supersedes prior conflicting seed values.

Older blueprints, legacy application code, historical deployments, and obsolete configuration must not silently override the current production-update sources.

When the source does not establish a fact, preserve an explicit state such as `UNKNOWN`, `TO_VERIFY`, `HISTORICAL`, `NOT_PROVIDED`, or `NOT_YET_ESTABLISHED` as appropriate. Do not manufacture a fact.

---

## 3. Canonical Temple Identity

| Identifier | Canonical value |
|---|---|
| Temple ID | `TEMPLE-0001` |
| Bengali name | `শ্রী শ্রী মা রক্ষা কালী মন্দির` |
| English name | `Sri Sri Maa Raksha Kali Mandir` |
| Deity ID | `DEITY-0001` |
| Deity | `মা রক্ষা কালী` |
| Location ID | `LOCATION-0001` |
| Location | `সাহাপুর বটতলা মোড়` |
| Latitude | `25.661726` |
| Longitude | `88.103574` |
| Timezone | `Asia/Kolkata` |
| Committee ID | `COMMITTEE-0001` |
| Current term | `TERM-0001` |

The canonical source also identifies the first-party temple name as `শ্রী শ্রী মা রক্ষা কালী মন্দির`.

External-platform display-name variants must not replace the first-party canonical name.

---

## 4. Complete Current Committee / Current Roster

The **current canonical roster contains nine current people**. All nine are current records for `TERM-0001`.

| Person ID | বাংলা নাম | English name | Current position | Role ID |
|---|---|---|---|---|
| `PERSON-000001` | মিঠুন সরকার | Mithun Sarkar | সভাপতি / President | `ROLE-PRESIDENT` |
| `PERSON-000002` | সঞ্জয় শীল | Sanjay Shil | সম্পাদক / Secretary | `ROLE-SECRETARY` |
| `PERSON-000003` | বাপি ভৌমিক | Bapi Bhowmick | কোষাধ্যক্ষ / Cashier | `ROLE-CASHIER` |
| `PERSON-000004` | তন্ময় দত্ত | Tanmay Dutta | সহ-কোষাধ্যক্ষ / Assistant Cashier | `ROLE-ASSISTANT-CASHIER` |
| `PERSON-000005` | চিন্ময় দত্ত | Chinmoy Dutta | মিডিয়া দায়িত্বপ্রাপ্ত / Media | `ROLE-MEDIA` |
| `PERSON-000006` | বিপ্লব সরকার | Biplab Sarkar | কার্যকরী সদস্য / Executive Member | `ROLE-EXECUTIVE-MEMBER` |
| `PERSON-000007` | মিন্টু শীল | Mintu Shil | সাংগঠনিক সম্পাদক / Organizing Secretary | `ROLE-ORGANIZING-SECRETARY` |
| `PERSON-000008` | জয়ন্ত দে সরকার | Jayanta Dey Sarkar | সহকারী সম্পাদক / Assistant Secretary | `ROLE-ASSISTANT-SECRETARY` |
| `PERSON-000009` | চয়ন সরকার | Chayan Sarkar | প্রতিষ্ঠাকালীন অংশগ্রহণকারী / Founding Participant | `ROLE-FOUNDING-PARTICIPANT` |

These assignments are current canonical data and must be treated as current positions, not as historical-only records.

The canonical source records these people as `VERIFIED_BY_PROJECT_OWNER`, with `TERM-0001`, and states that the current roster supersedes prior conflicting seed values.

The public committee directory should expose only the fields permitted by the public-contact/publication rules. Private phone and email fields belong to the private data layer and must not be copied into public documentation or public serializers merely because they exist in canonical source data.

---

## 5. Current Vacant Positions

The canonical source separately records these **four positions as currently vacant**:

| Position | Current status |
|---|---|
| সহ-সভাপতি / Vice President | Vacant |
| যুগ্ম সম্পাদক / Joint Secretary | Vacant |
| দপ্তর সম্পাদক / Office Secretary | Vacant |
| স্বেচ্ছাসেবক সমন্বয়কারী / Volunteer Coordinator | Vacant |

These four vacant positions are **not** additional people.

They must remain distinct from the nine current filled person-role assignments.

In particular:

> **Organizing Secretary is filled by `PERSON-000007` / Mintu Shil and is not vacant.**

Do not create a vacancy record for Organizing Secretary.

Do not invent people to fill any currently vacant position.

The canonical role-code registry supplied for the nine current assignments must not be expanded with invented role IDs merely to label the four vacant positions.

---

## 6. Committee Role Registry

The current supplied role IDs are:

| Role ID | বাংলা | English |
|---|---|---|
| `ROLE-PRESIDENT` | সভাপতি | President |
| `ROLE-SECRETARY` | সম্পাদক | Secretary |
| `ROLE-CASHIER` | কোষাধ্যক্ষ | Cashier |
| `ROLE-ASSISTANT-CASHIER` | সহ-কোষাধ্যক্ষ | Assistant Cashier |
| `ROLE-MEDIA` | মিডিয়া দায়িত্বপ্রাপ্ত | Media |
| `ROLE-EXECUTIVE-MEMBER` | কার্যকরী সদস্য | Executive Member |
| `ROLE-ORGANIZING-SECRETARY` | সাংগঠনিক সম্পাদক | Organizing Secretary |
| `ROLE-ASSISTANT-SECRETARY` | সহকারী সম্পাদক | Assistant Secretary |
| `ROLE-FOUNDING-PARTICIPANT` | প্রতিষ্ঠাকালীন অংশগ্রহণকারী | Founding Participant |

A role is a governed permission/resource concept. A person's display position must not be inferred from list order or from a name string.

---

## 7. Person / Role Relationship Model

The controlled relationship model is:

```text
Person master: PERSON-*
Role master: ROLE-*
Assignment: PROLE-*
Current term: TERM-0001
Historical assignments: separate PROLE records with effective validity
```

A person may hold multiple roles if the governed authorization model permits it.

Effective permissions are derived from active role assignments and policy checks.

The presence of a person record does not by itself grant administrative permissions.

The presence of a role label in UI does not by itself authorize a server operation.

---

## 8. Priest / Ritual Personnel Boundary

The canonical source separately records:

```text
PRIEST-000001
অসিত মুখার্জী
Asit Mukherjee
প্রধান/প্রতিষ্ঠাকালীন পুরোহিত
```

The priest record is a ritual-personnel record and must not be silently merged into the nine-person committee roster.

Committee membership, role assignment, and priest/ritual personnel are separate canonical concepts.

---

## 9. Panjika Baseline

| Field | Canonical value |
|---|---|
| Panjika ID | `PANJIKA-Y1433` |
| Calendar system | Bisuddha Siddhanta |
| Calculation version | `CALC-BS1433-RAIGANJ-V1` |
| Calculation basis | Raiganj regional calculation basis |
| Operational start | `2026-09-11` |
| Operational end | `2027-04-14` |
| Daily record count | `216` |
| Timezone | `Asia/Kolkata` |
| Daily calculation status | `CANONICAL_REGIONAL_CALCULATION` |
| Day ID pattern | `PJD-1433-YYYYMMDD` |

The temple coordinates identify the physical location. They do not replace the approved Raiganj calculation basis.

The 216 supplied daily records must not be silently recalculated with the temple GPS coordinates.

The first operational daily record is `2026-09-11` and the last is `2027-04-14`.

Daily IDs and Gregorian dates must remain unique.

---

## 10. Temple Operating Model

The current operating truth is:

| Property | Value |
|---|---|
| Daily opening model | `DAILY_MORNING_TO_NIGHT` |
| Fixed daily scheduled puja | `NONE` |
| Devotee-initiated puja | `ALLOWED/ACTUAL` |
| Amavasya puja | `RECURRING_REQUIRED` |
| Special puja timing | `EVENT_RUNTIME` |
| Special-puja decision window | Generally 1–2 days before event |
| Base schedule exact clock | `ADMIN_RUNTIME` |

The website must show daily openness separately from festival/Amavasya puja scheduling.

The website must not invent a permanent daily ritual timetable.

Historical schedule examples contained in older source material are not current canonical schedule values unless separately re-verified.

---

## 11. Amavasya and Temple Observance

`AMAVASYA` is a first-class canonical domain.

The supported relationship is:

```text
Astronomical / tithi record
  ↓
Amavasya record
  ↓
Temple Observance
  ↓
Puja
  ↓
Approved media / archive / notice / social / AI links
```

Recurring rule:

```text
প্রতি অমাবস্যায় পূজা হয়।
```

Special timing remains:

```text
EVENT_RUNTIME
```

and is normally decided close to the event.

Supported special categories include:

- Kaushiki Amavasya;
- Mahalaya Amavasya;
- Dipanwita/Shyama Puja;
- Ratanti Kali Puja / Maghi Krishna Chaturdashi;
- other officially declared special Amavasya observances.

A generic festival record must not automatically become a temple-official observance.

---

## 12. Canonical Data and Provenance

Material data must retain the identity and traceability appropriate to its domain.

Important concepts include:

- stable canonical ID;
- source ID/reference;
- verification status;
- provenance;
- revision history;
- publication status;
- audit linkage.

One fact should have one canonical record.

Derived views, search indexes, AI context, UI labels, caches, and notification payloads must derive from the canonical layer rather than becoming independent sources of truth.

Every correction to a material canonical record must create the appropriate revision/audit history.

---

## 13. Public / Private Boundary

### Public

Public data may include only approved fields such as:

- temple identity;
- approved public location information;
- approved public committee information;
- approved public notices;
- approved Panjika/calendar information;
- approved puja information;
- approved media;
- approved documents;
- public support information.

### Private

Private information includes or may include:

- personal phone numbers not explicitly approved for public display;
- private email addresses;
- authentication data;
- password material;
- reset tokens;
- session information;
- private support information;
- private notes;
- assignments;
- risk flags;
- private attachments;
- donor-sensitive information;
- audit-only information;
- infrastructure credentials.

Public serializers must be allow-lists.

Do not serialize a private record and attempt to remove a few sensitive fields afterward.

---

## 14. Authentication and Authorization

Administrative access is limited to the canonical identity model and the approved account lifecycle.

The target model includes:

```text
username OR registered phone
        +
password
```

First-login flow:

```text
Temporary credential
  ↓
Required setup
  ↓
Phone binding / confirmation
  ↓
Private password establishment
  ↓
Normal server-managed session
```

The security model includes:

- secure server-managed sessions;
- secure cookies;
- password hashing;
- temporary-credential rotation;
- short-lived, single-use password-reset tokens;
- hashed reset-token storage;
- rate limiting;
- account disable/revocation;
- reauthentication for high-risk actions where required.

Server-side permission checks are authoritative.

Client-side hidden buttons are not authorization.

---

## 15. Authorization Model

Conceptually:

```text
Authenticated actor
  ↓
Active role assignments
  ↓
Permission set
  ↓
Resource/scope check
  ↓
Policy check
  ↓
Audit where required
```

Finance-sensitive actions remain segregated from ordinary content publication.

Administrative super-user capability does not remove requirements for:

- source validation;
- workflow state;
- required approvals;
- audit;
- explicit high-risk confirmation.

A person may have more than one role, but effective access remains subject to policy.

---

## 16. Publication Governance

Editorial content uses governed states such as:

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

Creation is not publication.

Approval is not the same as creation.

An upload is not automatically public.

Historical content must be visibly historical or withheld according to publication rules.

Search and AI must index/use only content that is eligible for their respective public scope.

---

## 17. Donation Baseline

The current donation configuration is:

| Field | Value |
|---|---|
| Configuration ID | `DONATION-CONFIG-0001` |
| VPA | `7583992377@okbizaxis` |
| Payee | `Sri Sri Raksha Kali Mandir` |
| Minimum | `₹11` |
| Suggested amount | `₹51` |
| Suggested amount | `₹101` |
| Suggested amount | `₹501` |
| Suggested amount | `₹1001` |
| Transaction note | `শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী` |

A submitted UTR is not payment verification.

The finance lifecycle is conceptually:

```text
Donation intent
  ↓
Submitted payment reference
  ↓
Verification
  ↓
Approval
  ↓
Posting / reconciliation
```

Finance records and permissions must remain auditable.

---

## 18. Support / Grievance

Public routes:

```text
/contact
/grievance
/track-ticket
```

Administrative routes:

```text
/admin/inbox
/admin/inbox/[ticketId]
```

Ticket reference format:

```text
MRK-YYYY-NNNNNN
```

Public tracking requires:

```text
ticket reference + 4-digit PIN
```

A ticket reference alone is never authorization.

Support categories:

```text
FINANCE
PUJA
GRIEVANCE
GENERAL
```

Internal lifecycle states:

```text
OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
REJECTED
CLOSED
```

The tracking PIN must never be stored plaintext.

Ticket creation must be collision-safe through the durable data layer.

Public tracking must be rate-limited and must not expose private notes, assignments, risk flags, private attachments, identity hashes, or other protected data.

---

## 19. Upload and Attachment Limits

### Public grievance

- Maximum files: `3`
- Maximum per file: `5 MB`
- Maximum aggregate: `10 MB`
- Allowed: JPG/JPEG, PNG, WebP, PDF
- Video: disabled

### Committee photographs

- Maximum files: `10`
- Maximum per file: `5 MB`
- Maximum aggregate: `50 MB`

### Committee videos

- Maximum files: `2`
- Maximum per file: `50 MB`
- Maximum aggregate: `100 MB`

### Committee audio

- Maximum files: `2`
- Maximum per file: `25 MB`

### Committee documents

- Maximum files: `5`
- Maximum per file: `15 MB`

Enforcement is required across the complete control path:

```text
UI
  ↓
API validation / authorization
  ↓
Upload issuance
  ↓
Object upload
  ↓
Server finalization
  ↓
Worker / reconciliation / scanning where required
```

UI-only restrictions are insufficient.

---

## 20. Backblaze B2 Production Storage

Production object storage is **Backblaze B2**.

| Field | Value |
|---|---|
| Provider | Backblaze B2 |
| Bucket | `raksha-kali-mandir-storage` |
| Bucket ID | `48a58aafc4e2931aaf030011` |
| Region | `eu-central-003` |
| Endpoint | `https://s3.eu-central-003.backblazeb2.com` |
| Access model | Private |
| Credentials | Server-side only |

Private objects remain private.

Temporary object access must be:

- authorization-aware;
- short-lived;
- scoped;
- treated as bearer access.

The current V1.1.3 production target must not reintroduce Cloudflare R2 as an executable production storage implementation.

---

## 21. Email

The application uses a Resend adapter.

Current support-mail configuration supplied by the project is:

```text
maarakshakalisahapur@gmail.com
```

The current primary and backup values are identical. The application must therefore not send duplicate mail merely because two configuration slots contain the same destination.

Email states may include:

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

Production sending requires a provider-verified sender domain.

The `pages.dev` hosting domain must not be assumed to be a production email sender domain.

Webhook authenticity must be verified before mutation.

Duplicate and out-of-order provider events must be handled safely.

Email delivery failure must not delete or roll back a durable support-ticket state.

---

## 22. Search and AI

AI is a grounded interface, not a source of truth.

Search and AI use the same governed public read layer.

They must respect:

- publication status;
- verification status;
- provenance;
- historical labels;
- public/private classification;
- authorization.

AI must not:

- invent canonical temple facts;
- expose private records;
- bypass authorization;
- create a parallel canonical database;
- mutate canonical data through ordinary public conversation.

The public site must remain useful when AI is unavailable.

---

## 23. PWA and Client Caching

Only resources classified as safe for public caching may enter public service-worker caches.

Do not cache:

- administrative pages;
- authenticated API responses;
- private ticket responses;
- private attachments;
- sessions;
- secrets;
- private personal data.

Client caching must not bypass authorization.

---

## 24. Accessibility and Public UX

Accessibility is a first-class requirement.

Target: **WCAG 2.2 AA**.

The application should provide:

- semantic HTML;
- keyboard access;
- visible and non-obscured focus;
- accessible names and labels;
- accessible dialogs;
- meaningful status messaging;
- sufficient contrast;
- reduced-motion support;
- logical heading structure;
- usable forms and error messages;
- proper language attributes;
- accessible Bengali content.

The public UX should be simple for devotees and rigorous for operators.

Complexity belongs in the architecture and governance layers rather than in ordinary public user journeys.

---

## 25. UI and Brand

The visual system should be:

- sacred;
- warm;
- calm;
- respectful;
- Bengali-first;
- readable;
- restrained;
- responsive.

Avoid using as blanket defaults:

- gradients;
- glassmorphism;
- excessive shadows;
- decorative clutter;
- unnecessary motion.

Official photography requires provenance and publication approval.

A missing committee photograph should use an approved neutral fallback rather than an unrelated image.

The temple logo/brand asset remains a governed design/runtime matter until the appropriate approval state exists.

Do not fabricate a historical seal or falsely historical emblem.

---

## 26. Repository Architecture

The repository follows:

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

Administrative mutation follows:

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

The controlled repository includes areas such as:

```text
app/
components/
config/
data/
db/
domain/
lib/
repositories/
services/
tests/
worker/
docs/
scripts/
```

The exact file manifest is the authority for the complete 538-file repository.

---

## 27. Runtime Configuration

Mutable runtime values remain runtime configuration.

Examples:

- special puja times;
- publication state;
- notification state;
- support state;
- email provider configuration;
- feature flags;
- service credentials;
- environment-specific resource identifiers.

Do not hardcode mutable admin/runtime values into UI components.

Immutable technical invariants may be constants only when the architecture explicitly treats them as such.

---

## 28. Timezone and Scheduling

Business-time interpretation uses:

```text
Asia/Kolkata
```

UTC may be used internally for persisted instants when appropriate, but business presentation and date-sensitive logic must explicitly convert to `Asia/Kolkata`.

Scheduled workers that mutate or derive canonical state must be idempotent.

The midnight-IST scheduling representation used by the project is:

```text
30 18 * * *
```

because midnight IST corresponds to 18:30 UTC on the preceding UTC date.

Do not rely on exactly-once scheduling semantics.

---

## 29. Environment Separation

The project separates production and preview environments.

Production resources include:

```text
Cloudflare Worker / OpenNext runtime
Cloudflare D1
Cloudflare KV cache
Cloudflare KV session store
Backblaze B2
Resend production configuration
```

Preview resources are separately configured.

Preview must not silently mutate production.

Production secrets must never enter Git or client bundles.

---

## 30. Cloudflare Runtime

The selected deployment architecture is the Cloudflare Worker runtime through OpenNext.

The legacy Cloudflare Pages project is not the clean-slate application source of truth.

Do not mix incompatible deployment models such as:

- static export assumptions;
- legacy Pages adapter assumptions;
- an unrelated Worker framework;
- an alternate application runtime.

The repository's Next.js/OpenNext/Cloudflare configuration must remain coherent.

---

## 31. Development on Android / Termux

Git operations can be performed from Android/Termux.

Linux-dependent build/runtime tooling may require Ubuntu through `proot-distro` on Android.

An Android-native binary limitation must not cause the repository architecture to be changed.

The supported source/runtime architecture remains the controlled Node.js/Linux-compatible environment.

---

## 32. Validation

Batch validation must be evidence-based.

Depending on batch scope, checks may include:

```text
exact file existence
syntax
typecheck
lint
format
unit tests
integration tests
E2E tests
canonical-data validation
Panjika validation
security scans
static scans
dependency integrity
build validation
runtime validation
```

Only checks actually executed may be reported as passing.

A warning must not be silently represented as a passed validation.

A failure must not be hidden behind a phrase such as "looks good."

---

## 33. Git and Batch Discipline

Before starting a batch:

```bash
git status --short
git fetch origin
git log -1 --oneline --decorate
git log -1 --oneline --decorate origin/main
git rev-list --left-right --count main...origin/main
```

Before committing:

```bash
git status --short
git diff --check
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

A controlled batch must not absorb unexplained legacy files or unrelated changes.

---

## 34. Batch 004 File Ownership

Batch 004 owns exactly:

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

No other new implementation file belongs to Batch 004.

The files must be complete native Markdown files.

---

## 35. Foundation Batch History

### Batch 001

```text
.env.example
.gitignore
package.json
package-lock.json
```

### Batch 002

```text
tsconfig.json
next.config.ts
open-next.config.ts
wrangler.toml
```

### Batch 003

```text
eslint.config.mjs
prettier.config.mjs
vitest.config.ts
playwright.config.ts
```

### Batch 004

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

The complete clean-slate manifest contains 538 controlled repository files.

---

## 36. Contract Families

Foundation/configuration documentation is governed by:

```text
CTR-00001–CTR-00100  FOUNDATION
CTR-00101–CTR-00200  PRODUCT
CTR-06701–CTR-06800  CONFIG
```

The broader repository includes additional contract families for domains such as:

- governance;
- security;
- privacy;
- legal;
- calendar;
- temple observance;
- committee/RBAC;
- finance;
- support;
- email;
- storage;
- media;
- documents;
- search;
- AI;
- notifications;
- PWA;
- SEO;
- deployment;
- operations;
- backup.

Contracts are implementation obligations where their owning batches require them.

---

## 37. Clean-Slate Rule

Do not restore the previous application from:

- Git history;
- old branches;
- historical deployments;
- local backups;
- previous generated application trees.

Legacy source material may be used for audit/reference when specifically required, but legacy runtime behavior must not silently return.

Only approved current-batch and prior-approved-batch files belong in the reconstructed repository, together with explicitly permitted generated artifacts.

---

## 38. Dependency Policy

Dependency changes must be evaluated for:

- Node.js compatibility;
- Next.js compatibility;
- OpenNext compatibility;
- Cloudflare Worker compatibility;
- security;
- runtime impact;
- bundle impact;
- reproducibility;
- maintenance.

Do not force upgrades merely to silence warnings.

Do not silently migrate the project to an alternate framework/runtime.

The committed lockfile remains part of the reproducible dependency graph.

---

## 39. Error Handling

Errors must be explicit and observable.

Do not silently swallow:

- database failures;
- validation failures;
- authentication failures;
- authorization failures;
- storage failures;
- email failures;
- webhook failures;
- scheduled-job failures;
- state-machine violations.

Public error responses must avoid leaking secrets and unnecessary internals.

---

## 40. Security Reporting

Security vulnerabilities should be reported privately when public disclosure could enable exploitation.

Reports should include:

- affected area;
- reproduction details;
- security impact;
- relevant version/environment;
- mitigation information where available.

Do not include credentials, private ticket data, private attachments, or production secrets in a report.

See `SECURITY.md` for the repository security policy.

---

## 41. License and Reuse

This documentation batch does not establish a repository-wide open-source license.

Do not infer permission to reproduce, redistribute, modify, or commercially reuse project-specific repository content merely from the absence of a license file.

Third-party dependencies remain subject to their own licenses.

Project-specific source data, media, branding, documents, and other content remain subject to applicable ownership and usage restrictions.

---

## 42. Repository URLs

Repository:

```text
https://github.com/xenthyr/raksha-kali-mandir
```

Current public-site reference:

```text
https://maarakshakali.pages.dev
```

Google Maps:

```text
https://maps.app.goo.gl/AwerSG1peoGm2gUx9
```

WhatsApp group:

```text
https://chat.whatsapp.com/IRoYErTIKYF4Qr2bPl8FMX
```

The legacy Pages reference is not the source of truth for the clean-slate Worker implementation.

---

## 43. Canonical Source Artifact Hashes

The current production-update source artifacts used during the controlled reconstruction are identified by these SHA-256 values:

### V1.1.3 Unified Canonical Blueprint

```text
1e02b41c91a0e2fcfc072af2f01836fd59780d73bef0f28ee502d00331a86e8d
```

### V2.1 Canonical Source Data

```text
fc0f3f0c6ba27075035d77238f01793842cc405c82ca240c50fbfff2237e13dc
```

### Current 1433 Panjika production-update artifact

```text
6dc5cf755cb2f54a9884aa50c1d2cd486052d679054e3a9f31350e34e87be246
```

These hashes identify the supplied artifacts and must not be casually replaced by hashes from older source copies.

---

## 44. Repository Acceptance Boundary

Production readiness requires the complete system-level acceptance gate.

It includes, where applicable:

- 538-file tree completeness;
- source/hash validation;
- canonical-ID uniqueness;
- clean D1 migration;
- D1 query/repository integration;
- authentication/session/RBAC;
- donation state machine;
- support-ticket lifecycle;
- upload quota enforcement;
- private B2 isolation;
- email sender-domain verification;
- email webhook integrity;
- Panjika 216-row integrity;
- public route rendering;
- admin route authorization;
- search publication filtering;
- AI grounding/publication exclusion;
- PWA safety;
- SEO;
- accessibility;
- responsive mobile journeys;
- unit/integration/E2E/security suites;
- backup/restore verification;
- release/rollback validation.

A failed gate must be fixed or documented through the appropriate exception process.

---

## 45. Documentation Change Rule

When changing this README:

1. verify repository state;
2. verify current source precedence;
3. verify relevant contract/batch ownership;
4. avoid duplicating mutable runtime data unnecessarily;
5. preserve public/private boundaries;
6. validate the Markdown;
7. review the diff;
8. commit only the appropriate controlled batch.

The README is repository orientation and policy documentation. It does not supersede canonical data, schemas, contracts, security policy, or later domain documentation.

---

## 46. Final Principles

The repository follows these principles:

1. One fact → one canonical record.
2. Canonical data before presentation.
3. Explicit provenance and revision.
4. Server-side authorization.
5. Strict public/private separation.
6. Runtime values remain runtime values.
7. Deterministic business logic.
8. Explicit lifecycle states.
9. Idempotent retryable operations.
10. Bengali-first public experience.
11. `Asia/Kolkata` for business-time semantics.
12. No silent canonical drift.
13. No legacy restoration.
14. No secrets in Git.
15. No direct UI-to-D1 SQL.
16. No uncontrolled public object access.
17. No fabricated historical or temple-official facts.
18. AI is not a source of truth.
19. Committee role assignments remain canonical.
20. Panjika calculation basis remains canonical.
21. Validate before committing.
22. Report only checks actually performed.
23. Do not claim production readiness before the final release gate.

---

## 47. Current Canonical Identity Summary

```text
TEMPLE-0001
শ্রী শ্রী মা রক্ষা কালী মন্দির

DEITY-0001
মা রক্ষা কালী

LOCATION-0001
সাহাপুর বটতলা মোড়
25.661726, 88.103574
Asia/Kolkata

COMMITTEE-0001
শ্রী শ্রী মা রক্ষা কালী পূজা কমিটি ও সকল গ্রামবাসী

TERM-0001
বর্তমান কমিটি / current operating term

CURRENT ROSTER
PERSON-000001  → ROLE-PRESIDENT
PERSON-000002  → ROLE-SECRETARY
PERSON-000003  → ROLE-CASHIER
PERSON-000004  → ROLE-ASSISTANT-CASHIER
PERSON-000005  → ROLE-MEDIA
PERSON-000006  → ROLE-EXECUTIVE-MEMBER
PERSON-000007  → ROLE-ORGANIZING-SECRETARY
PERSON-000008  → ROLE-ASSISTANT-SECRETARY
PERSON-000009  → ROLE-FOUNDING-PARTICIPANT

CURRENT VACANCIES
Vice President
Joint Secretary
Office Secretary
Volunteer Coordinator

PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
CANONICAL_REGIONAL_CALCULATION
```

---

## 48. Final Statement

This repository exists to provide a trustworthy, secure, maintainable, Bengali-first digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

The repository must preserve the distinction between:

- source material;
- canonical records;
- provenance;
- verification;
- revision;
- publication;
- runtime configuration;
- derived data;
- public data;
- private data;
- committee role assignment;
- ritual personnel;
- Panjika calculation basis.

Its objective is not merely to make a website render.

The objective is to maintain a controlled system in which canonical truth remains canonical, private information remains private, administrative actions remain authorized, calendar data remains tied to the approved calculation basis, derived behavior remains deterministic, and the complete repository can ultimately be tested, deployed, monitored, backed up, restored, and rolled back through controlled engineering processes.

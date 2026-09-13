# Changelog

All notable repository and engineering changes for the controlled V1.1.3 reconstruction are recorded here.

This file records repository history and controlled baseline changes. It is **not** a second source of canonical temple data.

---

## [Unreleased] — V1.1.3 Clean-Slate Reconstruction

### Batch 004 — Foundation / Config

Prepared the complete root documentation set:

- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

The corrected Batch 004 documentation establishes and preserves:

- current source precedence;
- clean-slate repository policy;
- canonical temple identity;
- **all nine current committee/person-role assignments**;
- the four separately vacant positions;
- the explicit rule that Organizing Secretary is filled by Mintu Shil;
- priest/committee boundary;
- Panjika identity and Raiganj calculation basis;
- temple operating model;
- Amavasya observance model;
- donation baseline;
- support-ticket security;
- upload limits;
- Backblaze B2 production storage;
- Resend email policy;
- authentication and authorization;
- public/private boundaries;
- search/AI boundaries;
- PWA/cache restrictions;
- accessibility;
- batch ownership;
- validation;
- production acceptance boundaries.

This documentation deliberately does not claim final production readiness.

---

## Batch 003 — Foundation / Config

Added the controlled developer/test toolchain configuration:

```text
eslint.config.mjs
prettier.config.mjs
vitest.config.ts
playwright.config.ts
```

The batch established:

- ESLint flat configuration;
- Prettier policy;
- deterministic Vitest configuration;
- explicit Playwright local test-server configuration.

Recorded repository commit:

```text
98756b6 batch-003: foundation-config
```

---

## Batch 002 — Foundation / Config

Added:

```text
tsconfig.json
next.config.ts
open-next.config.ts
wrangler.toml
```

The batch established:

- strict TypeScript configuration;
- Next.js configuration;
- OpenNext Cloudflare configuration;
- Cloudflare Worker configuration;
- D1 bindings;
- production/preview KV bindings;
- environment separation.

---

## Batch 001 — Foundation / Config

Added:

```text
.env.example
.gitignore
package.json
package-lock.json
```

The batch established:

- Node.js/npm engine policy;
- repository scripts;
- dependency graph;
- safe environment template;
- Git ignore rules.

---

## Canonical Source Baseline

The controlled reconstruction uses the currently supplied production-update artifacts:

### V1.1.3 Unified Canonical Blueprint

```text
1e02b41c91a0e2fcfc072af2f01836fd59780d73bef0f28ee502d00331a86e8d
```

### V2.1 Canonical Source Data

```text
fc0f3f0c6ba27075035d77238f01793842cc405c82ca240c50fbfff2237e13dc
```

### 1433 Panjika Production-Update Data

```text
6dc5cf755cb2f54a9884aa50c1d2cd486052d679054e3a9f31350e34e87be246
```

These identifiers describe the source artifact versions used for the controlled reconstruction.

---

## Canonical Temple Baseline

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
```

---

## Committee Baseline — Corrected

The current canonical roster contains **nine current people/role assignments**:

| Person ID | Current role |
|---|---|
| `PERSON-000001` | `ROLE-PRESIDENT` — মিঠুন সরকার |
| `PERSON-000002` | `ROLE-SECRETARY` — সঞ্জয় শীল |
| `PERSON-000003` | `ROLE-CASHIER` — বাপি ভৌমিক |
| `PERSON-000004` | `ROLE-ASSISTANT-CASHIER` — তন্ময় দত্ত |
| `PERSON-000005` | `ROLE-MEDIA` — চিন্ময় দত্ত |
| `PERSON-000006` | `ROLE-EXECUTIVE-MEMBER` — বিপ্লব সরকার |
| `PERSON-000007` | `ROLE-ORGANIZING-SECRETARY` — মিন্টু শীল |
| `PERSON-000008` | `ROLE-ASSISTANT-SECRETARY` — জয়ন্ত দে সরকার |
| `PERSON-000009` | `ROLE-FOUNDING-PARTICIPANT` — চয়ন সরকার |

The current vacant positions are separate:

```text
Vice President
Joint Secretary
Office Secretary
Volunteer Coordinator
```

Organizing Secretary is **filled** by `PERSON-000007` and is **not vacant**.

This distinction is part of the corrected Batch 004 documentation baseline.

---

## Panjika Baseline

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
CANONICAL_REGIONAL_CALCULATION
Asia/Kolkata
```

The temple coordinates remain the physical location of the temple and do not replace the approved Raiganj Panjika calculation basis.

---

## Temple Operating Baseline

```text
DAILY_MORNING_TO_NIGHT
dailyFixedPuja = NONE
devoteeInitiatedPuja = ALLOWED/ACTUAL
amavasyaPuja = RECURRING_REQUIRED
specialPujaTiming = EVENT_RUNTIME
```

No permanent daily puja timetable is implied by this baseline.

---

## Amavasya Baseline

```text
AMAVASYA = first-class canonical domain
Recurring rule = প্রতি অমাবস্যায় পূজা হয়।
Special timing = EVENT_RUNTIME
Decision window = generally 1–2 days before event
```

Temple-specific observance must remain distinguishable from generic festival data.

---

## Donation Baseline

```text
DONATION-CONFIG-0001
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggestions = ₹51 / ₹101 / ₹501 / ₹1001
Transaction note = শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী
UTR != payment verification
```

---

## Support Baseline

```text
Reference = MRK-YYYY-NNNNNN
Tracking = reference + 4-digit PIN

Categories:
FINANCE
PUJA
GRIEVANCE
GENERAL

States:
OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
REJECTED
CLOSED
```

The PIN is never stored plaintext.

---

## Storage Baseline

Production object storage:

```text
Backblaze B2
Bucket = raksha-kali-mandir-storage
Bucket ID = 48a58aafc4e2931aaf030011
Region = eu-central-003
Endpoint = https://s3.eu-central-003.backblazeb2.com
Private
Server-side credentials
```

The current production target does not use Cloudflare R2.

---

## Upload Baseline

### Grievance

```text
3 files max
5 MB/file
10 MB aggregate
JPEG/PNG/WebP/PDF
Video disabled
```

### Committee media

```text
Photos: 10/upload, 5 MB/file, 50 MB aggregate
Videos: 2/upload, 50 MB/file, 100 MB aggregate
Audio: 2/upload, 25 MB/file
Documents: 5/upload, 15 MB/file
```

Server-side enforcement is authoritative.

---

## Email Baseline

Resend is the application email adapter.

Current operations mailbox configuration:

```text
maarakshakalisahapur@gmail.com
```

The current primary and backup configuration values are identical.

Production sender-domain verification is required.

Webhook authenticity and idempotent event handling are required.

---

## Security Baseline

The controlled security model includes:

- server-managed sessions;
- secure cookies;
- server-side authorization;
- password hashing;
- temporary-credential rotation;
- short-lived single-use password-reset tokens;
- rate limiting;
- account disable/revocation;
- public/private serializers;
- private B2 storage;
- webhook authenticity;
- auditability.

---

## UI / Accessibility Baseline

The public experience is:

- Bengali-first;
- warm;
- respectful;
- devotional;
- responsive;
- accessible;
- restrained.

Target accessibility standard:

```text
WCAG 2.2 AA
```

---

## Clean-Slate Policy

The current application repository is a clean-slate reconstruction.

Legacy application behavior must not be restored from:

- history;
- old branches;
- old deployments;
- old local trees.

Legacy material can be consulted for audit/reference only where specifically required.

---

## Controlled Repository Scope

The complete V1.1.3 manifest contains:

```text
BASELINE FILES = 392
SUPPLEMENTAL FILES = 146
CONTROLLED TOTAL = 538
```

Batch 004 owns:

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

---

## Production Readiness

The repository is not production-ready merely because a documentation batch is complete.

Final production acceptance requires the complete system-level gate, including applicable:

- tree completeness;
- canonical hashes;
- canonical-ID validation;
- D1 migration/integration;
- authentication/session/RBAC;
- donation/support state machines;
- attachment enforcement;
- B2 isolation;
- email verification/webhook integrity;
- Panjika 216-row integrity;
- public/admin route validation;
- search/AI publication controls;
- PWA;
- SEO;
- accessibility;
- testing;
- backup/restore;
- deployment;
- rollback.

---

## Change-Control Rule

A future changelog entry must:

- identify the affected batch/release;
- describe actual repository changes;
- avoid inventing source facts;
- avoid claiming unimplemented work is complete;
- avoid becoming a second canonical data source.

Historical changelog entries should not be rewritten merely to make the current state appear cleaner.

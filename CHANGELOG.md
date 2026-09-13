# Changelog

All notable repository changes for the controlled V1.1.3 reconstruction are recorded here.

This changelog describes repository and engineering changes. It is not a second source of canonical temple data.

---

## [Unreleased] — V1.1.3 Clean-Slate Reconstruction

### Batch 004 — Foundation / Config

Added the root repository policy/documentation set:

- `README.md`
- `SECURITY.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`

The Batch 004 documentation establishes:

- source-of-truth precedence;
- clean-slate repository rules;
- canonical identity locks;
- Panjika integrity rules;
- temple operating baseline;
- committee-role lock;
- donation baseline;
- support-ticket security rules;
- upload quotas;
- Backblaze B2 production storage policy;
- Resend email policy;
- authentication and authorization principles;
- public/private data separation;
- PWA/cache restrictions;
- Bengali-first editorial policy;
- accessibility expectations;
- batch ownership and contribution rules;
- production acceptance boundaries.

### Batch 003 — Foundation / Config

Added the controlled developer/test toolchain configuration:

- `eslint.config.mjs`
- `prettier.config.mjs`
- `vitest.config.ts`
- `playwright.config.ts`

The batch establishes:

- ESLint flat configuration;
- Prettier formatting policy;
- deterministic Vitest test configuration;
- explicit Playwright local test-server configuration;
- source/test path coverage appropriate to the clean-slate build.

The batch was committed as:

```text
98756b6 batch-003: foundation-config
```

### Batch 002 — Foundation / Config

Added the application/runtime foundation configuration:

- `tsconfig.json`
- `next.config.ts`
- `open-next.config.ts`
- `wrangler.toml`

The batch establishes:

- strict TypeScript configuration;
- Next.js configuration;
- OpenNext Cloudflare configuration;
- Cloudflare Worker configuration;
- D1 bindings;
- production/preview KV bindings;
- production/preview environment separation.

The repository is configured for the selected Cloudflare Worker/OpenNext architecture.

### Batch 001 — Foundation / Config

Added the package/environment foundation:

- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`

The batch establishes:

- Node.js/npm engine policy;
- application scripts;
- dependency graph;
- safe environment-variable template;
- Git ignore policy.

The committed dependency graph is represented by `package-lock.json`.

---

## Canonical Baseline — V1.1.3 Production-Update Sources

The repository follows the currently supplied production-update artifacts:

### Unified blueprint

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

---

## Canonical Identity Baseline

The current project identity is:

```text
TEMPLE-0001
শ্রী শ্রী মা রক্ষা কালী মন্দির

DEITY-0001
মা রক্ষা কালী

LOCATION-0001
সাহাপুর বটতলা মোড়
25.661726, 88.103574
Asia/Kolkata
```

---

## Committee Baseline

The current canonical committee mapping is:

```text
PERSON-000006 → ROLE-EXECUTIVE-MEMBER
PERSON-000007 → ROLE-ORGANIZING-SECRETARY
PERSON-000008 → ROLE-ASSISTANT-SECRETARY
```

---

## Panjika Baseline

The current calendar baseline is:

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
CANONICAL_REGIONAL_CALCULATION
```

The temple physical location and the Raiganj regional Panjika calculation basis remain separate concepts.

---

## Temple Operating Baseline

```text
DAILY_MORNING_TO_NIGHT
dailyFixedPuja = NONE
devoteeInitiatedPuja = ALLOWED/ACTUAL
amavasyaPuja = RECURRING_REQUIRED
specialPujaTiming = EVENT_RUNTIME
```

No fixed daily puja schedule is to be fabricated.

---

## Donation Baseline

```text
DONATION-CONFIG-0001
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggested = ₹51 / ₹101 / ₹501 / ₹1001
Transaction note = শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী
UTR is not payment verification
```

---

## Support Baseline

```text
Reference = MRK-YYYY-NNNNNN
Tracking = reference + 4-digit PIN
Categories = FINANCE / PUJA / GRIEVANCE / GENERAL
States = OPEN / IN_PROGRESS / WAITING_USER / RESOLVED / REJECTED / CLOSED
```

The tracking PIN is never stored plaintext.

Ticket reference alone is never authorization.

---

## Storage Baseline

The V1.1.3 production object-storage target is Backblaze B2:

```text
Bucket = raksha-kali-mandir-storage
Bucket ID = 48a58aafc4e2931aaf030011
Region = eu-central-003
Endpoint = https://s3.eu-central-003.backblazeb2.com
Access = private
Credentials = server-side only
```

Older R2 implementation references are superseded for the V1.1.3 production target and must not return to executable production code.

---

## Upload Baseline

Public grievance:

```text
3 attachments max
5 MB/file
10 MB aggregate
JPEG/PNG/WebP/PDF only
video disabled
```

Committee media:

```text
Photos: 10/upload, 5 MB/file, 50 MB aggregate
Videos: 2/upload, 50 MB/file, 100 MB aggregate
Audio: 2/upload, 25 MB/file
Documents: 5/upload, 15 MB/file
```

Server-side enforcement is authoritative.

---

## Email Baseline

The email integration uses Resend.

The currently supplied operations mailbox configuration is:

```text
maarakshakalisahapur@gmail.com
```

The primary and backup configuration values are the same and therefore must not generate duplicate copies solely because they occupy two configuration slots.

Production sending requires a provider-verified sender domain.

Webhook authenticity must be verified before event mutation.

Email failure must not delete or roll back durable support-ticket state.

---

## Security Baseline

The controlled security model includes:

- server-managed sessions;
- secure cookies;
- server-side authorization;
- password hashing;
- temporary first-login credential rotation;
- single-use, short-lived reset tokens;
- rate limiting;
- account disable/revocation;
- audit controls;
- explicit public/private serializers;
- private object-storage isolation;
- server-only secrets.

---

## UI / Accessibility Baseline

The public application is:

- Bengali-first;
- warm;
- respectful;
- devotional;
- responsive;
- accessible.

The project avoids:

- blanket gradients;
- glassmorphism;
- excessive shadows;
- decorative clutter.

Motion respects `prefers-reduced-motion`.

The assistant/AI experience remains supplementary to the public site.

---

## Clean-Slate Policy

The current repository is a clean-slate reconstruction.

The following are not to be restored as active implementation:

- old pages;
- old components;
- old APIs;
- old authentication;
- old storage code;
- old deployment configuration;
- old source-of-truth copies.

Repository history may be used for audit/reference purposes but is not a permission to revive legacy application behavior.

---

## Documentation Policy

Documentation reflects governed repository behavior.

Documentation must not:

- invent canonical facts;
- expose secrets;
- describe unimplemented functionality as completed;
- create a conflicting source of truth;
- bypass batch ownership.

Detailed domain documentation is added by its owning later batch.

---

## Release Policy

Production-ready status is reserved for the complete final release gate.

The final release requires, where applicable:

- 538-file tree completeness;
- source/hash validation;
- canonical-ID integrity;
- D1 migration/integration;
- auth/session/RBAC;
- support/donation state machines;
- B2 isolation;
- email sender/webhook checks;
- Panjika 216-row integrity;
- public/admin route validation;
- search/AI publication security;
- PWA safety;
- SEO;
- accessibility;
- responsive mobile journeys;
- unit/integration/E2E/security tests;
- backup/restore;
- release/rollback checks.

A failed gate must be fixed or captured in a formal exception record with owner, date, scope, risk, and reason.

---

## Versioning Note

This file uses an `[Unreleased]` section because the V1.1.3 repository reconstruction is still in progress.

Future releases should add dated/versioned sections without rewriting historical entries.

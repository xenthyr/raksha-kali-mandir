# Contributing Guide

## 1. Purpose

This repository is a controlled V1.1.3 clean-slate reconstruction of the digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

Contributions must preserve the project's:

- canonical source-of-truth model;
- repository architecture;
- contract boundaries;
- security model;
- public/private separation;
- Bengali-first public experience;
- Panjika integrity;
- committee-role integrity;
- runtime/environment separation;
- reproducible build;
- controlled batch ownership.

This is not an unrestricted greenfield repository.

---

## 2. Read Before Changing Anything

Before modifying the repository, understand:

1. the current Git status;
2. the current branch and remote state;
3. the relevant batch prompt;
4. the current source precedence;
5. the relevant canonical IDs;
6. the owning contracts;
7. the dependency order;
8. the security/privacy classification;
9. the required validation checks.

Do not start by copying code from a previous deployment or legacy branch.

---

## 3. Source Precedence

For factual project information, use:

```text
V1.1.3 Unified Canonical Blueprint
        ↓
V2.1 Canonical Source-Data Overlay
        ↓
1433 Panjika Canonical Data
        ↓
Implementation inference only where necessary
```

Do not use an older blueprint as a replacement for the current production-update source.

When the source does not establish a fact, preserve an explicit state rather than inventing one.

---

## 4. Canonical Locks

The following are canonical:

```text
TEMPLE-0001 = শ্রী শ্রী মা রক্ষা কালী মন্দির
DEITY-0001 = মা রক্ষা কালী
LOCATION-0001 = সাহাপুর বটতলা মোড়
LOCATION-0001 = 25.661726, 88.103574
TIMEZONE = Asia/Kolkata
```

Committee:

```text
PERSON-000006 = Biplab Sarkar
                 ROLE-EXECUTIVE-MEMBER

PERSON-000007 = Mintu Shil
                 ROLE-ORGANIZING-SECRETARY

PERSON-000008 = Jayanta Dey Sarkar
                 ROLE-ASSISTANT-SECRETARY
```

Panjika:

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
```

Operations:

```text
DAILY_MORNING_TO_NIGHT
dailyFixedPuja = NONE
devoteeInitiatedPuja = ALLOWED/ACTUAL
amavasyaPuja = RECURRING_REQUIRED
specialPujaTiming = EVENT_RUNTIME
```

Donation:

```text
DONATION-CONFIG-0001
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggestions = ₹51 / ₹101 / ₹501 / ₹1001
UTR != payment verification
```

Support:

```text
MRK-YYYY-NNNNNN
4-digit tracking PIN
FINANCE / PUJA / GRIEVANCE / GENERAL
OPEN / IN_PROGRESS / WAITING_USER / RESOLVED / REJECTED / CLOSED
```

Storage:

```text
Backblaze B2
raksha-kali-mandir-storage
eu-central-003
private
server-side only
```

Do not silently alter these values in application code.

---

## 5. Clean Working Tree

Before starting a batch:

```bash
cd ~/raksha-kali-mandir

git status --short
git fetch origin
git log -1 --oneline --decorate
git log -1 --oneline --decorate origin/main
git rev-list --left-right --count main...origin/main
```

The expected controlled state is:

- local and remote `main` agree;
- no unrelated working-tree changes;
- no unexplained untracked files.

If an unexpected legacy application file or unexplained untracked file appears, stop and investigate.

Do not absorb it silently.

---

## 6. Controlled Batch Ownership

Every batch has an exact file allowlist.

The batch must:

- create every allowlisted file;
- avoid unlisted implementation files;
- respect dependencies;
- use the specified source artifacts;
- run the required validation;
- commit only the batch when green.

The clean-slate repository has:

```text
Baseline controlled files: 392
Supplemental controlled files: 146
Total controlled files: 538
```

Every controlled file has exactly one owning batch.

---

## 7. Batch 004 Ownership

Batch 004 owns exactly:

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

No other new implementation file belongs to Batch 004.

Batch 004 is documentation and repository-policy work. It must not broaden scope merely to make later domains appear implemented.

Later domain-specific documentation belongs to its owning documentation batches.

---

## 8. Repository Architecture

The architecture is:

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

Administrative writes follow:

```text
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

AI sits above the same governed read layer.

Do not introduce:

- a parallel framework;
- a parallel data model;
- a duplicate source of truth;
- direct UI-to-D1 SQL;
- a second canonical identity system.

---

## 9. Canonical Data Rules

Use canonical IDs.

Do not derive identity from:

- array order;
- filenames;
- display names;
- role labels;
- historical prose.

Do not duplicate mutable facts in components merely to make the UI render.

Runtime/admin-managed values remain runtime/admin-managed.

Where provenance, verification, revision, publication, or audit are required, preserve them.

---

## 10. Public / Private Boundaries

Before exposing any value, classify it.

### Public

Examples:

- approved temple facts;
- approved deity information;
- approved committee public information;
- approved notices;
- approved calendar records;
- approved media;
- approved documents.

### Private

Examples:

- passwords;
- sessions;
- private contact information;
- private ticket data;
- private notes;
- risk flags;
- donor-sensitive information;
- private attachments;
- audit data;
- credentials.

Public serializers should be allow-lists.

Do not return a private object and remove a few fields after the fact.

---

## 11. Runtime Configuration

Runtime/admin-managed values must not be turned into component constants merely because a component is easier to build that way.

Examples include:

- special puja timing;
- publication state;
- notification state;
- support state;
- admin-managed configuration;
- sender configuration;
- feature flags.

Canonical immutable facts must come from the canonical data layer.

---

## 12. Panjika Rules

The Panjika uses:

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
```

Current operational range:

```text
2026-09-11 through 2027-04-14
216 records
```

The temple coordinates:

```text
25.661726 / 88.103574
```

identify the physical temple location.

They do not replace the Raiganj calculation basis.

Never:

- switch to temple GPS for Panjika calculations;
- merge Surya Siddhanta values;
- silently recalculate supplied astronomical rows;
- fabricate a daily puja schedule.

The production-update correction sets daily calculation status to:

```text
CANONICAL_REGIONAL_CALCULATION
```

while preserving supplied astronomical values.

---

## 13. Committee Rules

Do not change:

```text
PERSON-000006 → ROLE-EXECUTIVE-MEMBER
PERSON-000007 → ROLE-ORGANIZING-SECRETARY
PERSON-000008 → ROLE-ASSISTANT-SECRETARY
```

Do not revive deprecated/obsolete alternate raw-name records as replacements.

If a committee change is required, use the canonical governance workflow.

---

## 14. Donation Rules

The canonical donation configuration is:

```text
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggestions = ₹51 / ₹101 / ₹501 / ₹1001
Transaction note = শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী
```

A UTR submission is not payment verification.

Do not write UI logic that treats the UTR as a verified financial fact.

---

## 15. Support Rules

Ticket reference:

```text
MRK-YYYY-NNNNNN
```

Public tracking:

```text
reference + 4-digit PIN
```

Internal categories:

```text
FINANCE
PUJA
GRIEVANCE
GENERAL
```

Internal states:

```text
OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
REJECTED
CLOSED
```

The PIN must never be stored plaintext.

The reference alone is never authorization.

Private ticket information must remain out of public serializers.

---

## 16. Attachment Rules

Server is authoritative.

Grievance:

```text
3 files max
5 MB/file
10 MB aggregate
JPEG/PNG/WebP/PDF
video disabled
```

Committee photos:

```text
10 files max
5 MB/file
50 MB aggregate
```

Committee videos:

```text
2 files max
50 MB/file
100 MB aggregate
```

Committee audio:

```text
2 files max
25 MB/file
```

Committee documents:

```text
5 files max
15 MB/file
```

Limits must be enforced through the complete security path:

```text
UI → API → authorization → upload issuance → finalization → worker/reconciliation
```

---

## 17. Backblaze B2 Rules

Production object storage is:

```text
Provider: Backblaze B2
Bucket: raksha-kali-mandir-storage
Bucket ID: 48a58aafc4e2931aaf030011
Region: eu-central-003
Endpoint: https://s3.eu-central-003.backblazeb2.com
Access: private
```

Credentials remain server-side.

Do not introduce R2 as an executable production storage path.

Private object access must be authorization-aware and temporary where temporary URLs are used.

---

## 18. Email Rules

Resend is the application email adapter.

Current operations address configuration:

```text
maarakshakalisahapur@gmail.com
```

The configured primary and backup values are identical, so do not send duplicate copies based only on the two slots.

Production sender domain must be provider-verified.

Development and preview must not accidentally send production mail.

Webhook verification precedes event mutation.

Duplicate provider events must be safe to replay.

---

## 19. Security Rules

Never:

- commit credentials;
- expose secrets to browser code;
- trust hidden UI controls as authorization;
- return private records from public APIs;
- store reset tokens plaintext;
- store ticket PINs plaintext;
- expose private object URLs without authorization;
- log passwords or secrets;
- trust external webhook payloads before verification.

Security failures should fail closed.

---

## 20. TypeScript and Validation

Use strict TypeScript.

Validate untrusted inputs at runtime boundaries.

Prefer:

- small pure functions;
- explicit domain types;
- discriminated states;
- typed errors;
- deterministic transformations.

Do not rely on compile-time types alone for user input, webhooks, query parameters, or persisted records.

---

## 21. Errors and Failure States

Do not silently swallow failures.

Every important mutation should define:

- success state;
- failure state;
- retry behavior;
- idempotency behavior;
- authorization behavior;
- observability.

A failed email must not erase a ticket.

A failed retry must not create duplicate state.

A failed webhook verification must not mutate data.

A missing calendar row must not be silently fabricated.

---

## 22. Timezone

Use:

```text
Asia/Kolkata
```

for business-time logic.

Use UTC for persisted instants where appropriate.

Convert explicitly.

Scheduled workers touching canonical data must be idempotent.

---

## 23. Development Tooling

The controlled repository uses the package graph established by the foundation batches.

Typical checks:

```bash
npm run format:check
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run build
```

Run the narrowest relevant check first, then broader checks.

Do not claim checks passed without actually running them.

---

## 24. Android / Termux

Git can be used directly from Termux.

Linux-dependent application/build tooling may require Ubuntu through `proot-distro`.

Do not change the project architecture to compensate for an unsupported Android-native binary.

Use the repository's intended Linux-compatible tooling environment for builds and Cloudflare runtime checks.

---

## 25. Dependency Policy

Dependency changes should be justified.

Evaluate:

- compatibility;
- security;
- runtime behavior;
- OpenNext compatibility;
- Cloudflare compatibility;
- Node.js compatibility;
- bundle/runtime size;
- maintenance;
- reproducibility.

Do not force upgrades solely to suppress warnings.

Do not silently migrate to a new deployment architecture.

---

## 26. Formatting

Use the repository's Prettier configuration.

Use LF line endings.

Do not reformat unrelated files inside a controlled batch unless the formatting change is directly required and explicitly allowed.

Run:

```bash
npm run format:check
```

before committing documentation-only changes.

---

## 27. Testing

Tests must be deterministic.

Tests must not require:

- production credentials;
- live production services;
- private external accounts.

Where a later batch owns a live integration, use fixtures/mocks or approved integration environments appropriate to the test layer.

Do not weaken tests merely to obtain a green result.

---

## 28. Documentation Changes

Documentation must describe actual repository policy.

Do not:

- claim future implementation as completed;
- invent source facts;
- expose secrets;
- describe legacy code as current;
- create conflicting architecture rules;
- introduce a second source of truth.

Use a later documentation batch for detailed domain documents owned by that batch.

Root policy documents should remain high-level enough to remain stable while still defining the governing constraints.

---

## 29. Git Diff Review

Before committing:

```bash
git status --short
git diff --check
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Inspect the staged content.

Confirm:

- exact allowlist;
- no secret leakage;
- no accidental R2 implementation;
- no Panjika drift;
- no committee-role drift;
- no unrelated source changes.

---

## 30. Commit Procedure

For Batch 004:

```bash
git add README.md SECURITY.md CONTRIBUTING.md CHANGELOG.md
git diff --cached --check
git diff --cached --name-only
git commit -m "batch-004: foundation-config"
git push origin main
```

Do not commit if the batch is not green.

---

## 31. Batch Handoff

After the batch, report:

1. exact files created/modified;
2. prerequisites consumed;
3. source sections/IDs checked;
4. tests/static checks actually run;
5. intentional later-batch seams;
6. blockers.

Do not hide a failure behind a general statement such as "looks good."

---

## 32. Stop Conditions

Stop and fix the batch if:

- an allowlisted file is missing;
- an unapproved file changed;
- an unexpected legacy file appears;
- a secret is exposed;
- a public serializer exposes private fields;
- an authentication/authorization boundary is weakened;
- a canonical ID drifts;
- a committee role drifts;
- the Panjika calculation basis drifts;
- a private object becomes public;
- a test exposes an unresolved state-machine violation;
- a local import points to a missing dependency;
- a required validation check fails because of the batch.

---

## 33. Production Release Rules

Do not call the repository production-ready until the full production preflight is green or a formal exception exists.

Final release validation covers, where applicable:

- tree completeness;
- canonical hashes;
- unique canonical IDs;
- D1 migration;
- query/repository integration;
- auth/session/RBAC;
- donation state machine;
- support lifecycle;
- attachment security;
- private B2 isolation;
- email sender verification;
- webhook integrity;
- Panjika 216-row integrity;
- public routes;
- admin authorization;
- search/AI publication filtering;
- PWA safety;
- SEO;
- accessibility;
- responsive mobile journeys;
- unit/integration/E2E/security tests;
- backup/restore;
- release/rollback.

---

## 34. Contribution Principle

The most important contribution rule is:

> Preserve the project's canonical truth, security boundaries, and controlled architecture even when a local shortcut would be easier.

A contribution is successful when it is correct, source-grounded, testable, secure, reviewable, and compatible with the controlled build sequence.

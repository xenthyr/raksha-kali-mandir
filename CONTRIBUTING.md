# Contributing Guide

## 1. Purpose

This repository is a controlled V1.1.3 clean-slate reconstruction of the digital platform for **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

Contributions must preserve:

- canonical source-of-truth rules;
- canonical IDs;
- complete current committee roster;
- current committee role assignments;
- explicit vacant-position status;
- Panjika integrity;
- public/private boundaries;
- Bengali-first public UX;
- server-side security;
- runtime/environment separation;
- reproducible builds;
- exact batch ownership;
- governed publication and audit.

This is not an unrestricted greenfield repository.

---

## 2. Before You Change Anything

Before changing the repository:

1. inspect Git state;
2. confirm local and remote branch state;
3. read the owning batch;
4. inspect the current canonical source material;
5. identify relevant canonical IDs;
6. identify contract families;
7. identify security/privacy classification;
8. identify dependencies;
9. identify required validation;
10. identify any later-batch seam.

Do not begin by copying the previous application.

---

## 3. Source Precedence

Use:

```text
V1.1.3 Unified Canonical Blueprint
        ↓
V2.1 Canonical Source-Data Overlay
        ↓
1433 Panjika Canonical Data
        ↓
Implementation inference only where required
```

The current V2.1 roster is explicitly current and user-confirmed.

Do not revert to older conflicting seed values.

When the source does not establish a fact, preserve the appropriate state such as `UNKNOWN`, `TO_VERIFY`, `NOT_PROVIDED`, or `HISTORICAL`.

---

## 4. Canonical Identity Locks

```text
TEMPLE-0001 = শ্রী শ্রী মা রক্ষা কালী মন্দির
DEITY-0001 = মা রক্ষা কালী
LOCATION-0001 = সাহাপুর বটতলা মোড়
Coordinates = 25.661726, 88.103574
Timezone = Asia/Kolkata
COMMITTEE-0001 = শ্রী শ্রী মা রক্ষা কালী পূজা কমিটি ও সকল গ্রামবাসী
TERM-0001 = current operating committee term
```

Do not derive identity from:

- display names;
- filenames;
- array order;
- UI order;
- old raw-name fields.

---

## 5. Complete Current Committee Lock

All nine of these are current `TERM-0001` people/role assignments:

| Person ID | Person | Current role |
|---|---|---|
| `PERSON-000001` | মিঠুন সরকার / Mithun Sarkar | `ROLE-PRESIDENT` |
| `PERSON-000002` | সঞ্জয় শীল / Sanjay Shil | `ROLE-SECRETARY` |
| `PERSON-000003` | বাপি ভৌমিক / Bapi Bhowmick | `ROLE-CASHIER` |
| `PERSON-000004` | তন্ময় দত্ত / Tanmay Dutta | `ROLE-ASSISTANT-CASHIER` |
| `PERSON-000005` | চিন্ময় দত্ত / Chinmoy Dutta | `ROLE-MEDIA` |
| `PERSON-000006` | বিপ্লব সরকার / Biplab Sarkar | `ROLE-EXECUTIVE-MEMBER` |
| `PERSON-000007` | মিন্টু শীল / Mintu Shil | `ROLE-ORGANIZING-SECRETARY` |
| `PERSON-000008` | জয়ন্ত দে সরকার / Jayanta Dey Sarkar | `ROLE-ASSISTANT-SECRETARY` |
| `PERSON-000009` | চয়ন সরকার / Chayan Sarkar | `ROLE-FOUNDING-PARTICIPANT` |

These are current positions, not merely historical candidates.

---

## 6. Vacant Positions Lock

The following four positions are currently vacant:

```text
Vice President
Joint Secretary
Office Secretary
Volunteer Coordinator
```

These are vacant positions, not vacant people.

Do not infer or fabricate a person for any vacancy.

Do not mark Organizing Secretary as vacant.

```text
PERSON-000007
মিন্টু শীল / Mintu Shil
ROLE-ORGANIZING-SECRETARY
CURRENT
```

The supplied role registry contains explicit role IDs for the nine current assignments. Do not invent new canonical role IDs for the four vacancies unless a future canonical source explicitly defines them.

---

## 7. Priest Boundary

The priest is a separate canonical personnel record:

```text
PRIEST-000001
অসিত মুখার্জী / Asit Mukherjee
```

Do not merge priest/ritual-personnel data into the committee roster.

---

## 8. Panjika Lock

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 daily records
CANONICAL_REGIONAL_CALCULATION
Asia/Kolkata
```

Temple coordinates identify the temple location only.

Never silently switch the Panjika calculation basis to the temple GPS.

Never silently recompute the 216 supplied astronomical records.

Never introduce Surya Siddhanta values into the current 1433 canonical dataset.

---

## 9. Temple Operating Lock

```text
DAILY_MORNING_TO_NIGHT
dailyFixedPuja = NONE
devoteeInitiatedPuja = ALLOWED/ACTUAL
amavasyaPuja = RECURRING_REQUIRED
specialPujaTiming = EVENT_RUNTIME
specialPujaDecisionWindow = generally 1–2 days before event
```

Do not fabricate fixed daily ritual times.

Special-puja time is runtime/admin data.

---

## 10. Amavasya Lock

`AMAVASYA` is first-class.

The relationship is:

```text
Tithi
  ↓
Amavasya
  ↓
Temple Observance
  ↓
Puja
  ↓
Approved downstream publications
```

Recurring rule:

```text
প্রতি অমাবস্যায় পূজা হয়।
```

Special timing is runtime-managed.

Do not convert a generic festival listing into a temple-official observance without an approved observance record.

---

## 11. Data Governance

Preserve:

- canonical IDs;
- source references;
- provenance;
- verification;
- revision;
- publication;
- audit.

Do not create duplicate canonical records because a UI requires a different representation.

Do not use a component constant as a substitute for mutable runtime data.

One fact should have one canonical record.

---

## 12. Public / Private Data

Before exposing any value, classify it.

### Public

Examples:

- approved temple facts;
- approved public committee details;
- approved notices;
- approved calendar data;
- approved media;
- approved documents.

### Private

Examples:

- non-public phone/email;
- authentication data;
- sessions;
- password material;
- reset tokens;
- private support information;
- private attachments;
- donor-sensitive information;
- internal audit data;
- secrets.

Public serializers must be explicit allow-lists.

Never return a private record and remove a few fields afterward.

---

## 13. Authentication

Administrative authentication is based on the approved canonical identity model.

```text
username OR registered phone
+
password
```

First login:

```text
temporary credential
→ required setup
→ phone binding/confirmation
→ private password
→ server-managed session
```

No public administrative signup.

No uncontrolled social-login replacement.

Passwords are never stored plaintext.

---

## 14. Authorization

Server-side authorization is authoritative.

Conceptual flow:

```text
Actor
 ↓
Authentication
 ↓
Active role(s)
 ↓
Permission(s)
 ↓
Resource/scope check
 ↓
Policy check
 ↓
Audit
```

Do not treat:

- hidden UI controls;
- disabled buttons;
- route visibility;
- client state

as authorization.

Finance-sensitive actions remain separated from ordinary publication operations.

---

## 15. Publication

Governed editorial states include:

```text
DRAFT
IN_REVIEW
APPROVED
PUBLISHED
ARCHIVED
```

Creation does not mean publication.

Approval does not automatically mean public visibility without the required publication state.

Historical information must remain clearly historical.

---

## 16. Donation Rules

```text
DONATION-CONFIG-0001
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggestions = ₹51 / ₹101 / ₹501 / ₹1001
Transaction note = শ্রী শ্রী রক্ষা কালী মন্দির প্রণামী
```

A submitted UTR is not payment verification.

Do not write client logic that interprets a UTR as a verified financial fact.

---

## 17. Support Rules

```text
MRK-YYYY-NNNNNN
reference + 4-digit PIN
```

Categories:

```text
FINANCE
PUJA
GRIEVANCE
GENERAL
```

States:

```text
OPEN
IN_PROGRESS
WAITING_USER
RESOLVED
REJECTED
CLOSED
```

The PIN must never be stored plaintext.

Ticket references alone are not authentication.

Public tracking must be rate-limited.

Private notes, assignments, risk flags, private attachments, identity hashes, and internal data must remain private.

---

## 18. Upload Limits

### Grievance

```text
3 files max
5 MB/file
10 MB aggregate
JPEG/PNG/WebP/PDF
video disabled
```

### Committee photos

```text
10 files max
5 MB/file
50 MB aggregate
```

### Committee videos

```text
2 files max
50 MB/file
100 MB aggregate
```

### Committee audio

```text
2 files max
25 MB/file
```

### Committee documents

```text
5 files max
15 MB/file
```

Server enforcement is authoritative.

---

## 19. Storage

Production storage:

```text
Backblaze B2
Bucket: raksha-kali-mandir-storage
Bucket ID: 48a58aafc4e2931aaf030011
Region: eu-central-003
Endpoint: https://s3.eu-central-003.backblazeb2.com
Private
Server-side credentials
```

Do not reintroduce executable R2 production paths.

Private object URLs must be controlled and temporary where used.

---

## 20. Email

Resend is the email adapter.

Current configured support address:

```text
maarakshakalisahapur@gmail.com
```

Primary and backup configuration currently use the same address. Do not create duplicate delivery solely because both configuration slots match.

Production sending requires a verified sender domain.

Webhook authenticity must be verified before state mutation.

Provider events must be idempotent and tolerant of duplicate/out-of-order delivery where applicable.

---

## 21. Search and AI

Search/AI must use the governed public read model.

AI must respect:

- publication;
- verification;
- provenance;
- historical labeling;
- public/private boundaries;
- authorization.

AI is not the source of truth.

AI must not mutate canonical data through ordinary public conversation.

Public functionality must remain useful without AI.

---

## 22. PWA / Caching

Do not cache:

- admin pages;
- authenticated API responses;
- private ticket information;
- private attachments;
- sessions;
- secrets.

Caching must never bypass authorization.

---

## 23. B2 Upload Security

Use the complete control path:

```text
UI
→ API authorization
→ validation
→ upload issuance
→ object upload
→ server finalization
→ worker/reconciliation
```

Client-only file count/size/type validation is not sufficient.

---

## 24. Development Environment

Git operations can run in Android/Termux.

Linux-dependent Node.js/build/Cloudflare runtime tooling may require Ubuntu through `proot-distro`.

Do not change the repository architecture merely because an Android-native binary cannot execute.

---

## 25. Code Style

Prefer:

- strict TypeScript;
- small pure functions;
- explicit domain types;
- discriminated states;
- typed errors;
- runtime validation for untrusted inputs;
- server-side security boundaries.

Do not rely only on compile-time types for:

- request bodies;
- query parameters;
- webhooks;
- file metadata;
- persisted records.

---

## 26. Testing

Tests must be deterministic.

They must not require:

- production credentials;
- production secrets;
- uncontrolled live services.

Do not weaken tests to make them green.

Run the narrowest relevant test first, then broader checks.

Only claim tests that actually ran.

---

## 27. Batch 004

Batch 004 owns exactly:

```text
README.md
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
```

No other implementation file belongs to this batch.

The complete controlled repository manifest contains 538 files.

---

## 28. Git Workflow

Before a batch:

```bash
git status --short
git fetch origin
git log -1 --oneline --decorate
git log -1 --oneline --decorate origin/main
git rev-list --left-right --count main...origin/main
```

Before commit:

```bash
git status --short
git diff --check
git diff --cached --check
git diff --cached --stat
git diff --cached --name-only
```

Stop for:

- unexplained untracked files;
- legacy source reappearance;
- secret leakage;
- canonical-ID drift;
- committee-role drift;
- Panjika drift;
- private-data leakage;
- failed required checks.

---

## 29. Commit

For Batch 004:

```text
batch-004: foundation-config
```

Only the controlled batch should be committed, apart from explicitly permitted formatting/import changes that are directly required by the batch.

---

## 30. Validation Checklist

Before declaring the batch green, confirm:

- all four exact files exist;
- all four are complete Markdown files;
- no secrets are present;
- no client-side server-only imports are introduced by documentation;
- no R2 production implementation is introduced;
- all nine current committee assignments are represented consistently;
- the four vacant positions are represented separately;
- Organizing Secretary is represented as filled;
- priest data remains separate from committee membership;
- Panjika basis remains `CALC-BS1433-RAIGANJ-V1`;
- Panjika range remains `2026-09-11..2027-04-14`;
- Panjika count remains `216`;
- donation rules are accurate;
- support-ticket authentication is accurate;
- B2 storage target is accurate;
- email policy is accurate;
- production readiness is not falsely claimed.

---

## 31. Documentation Principle

Root documentation should be comprehensive enough to preserve architectural and governance intent without becoming a second source of canonical runtime data.

When implementation details belong to a later owned document, reference the governing concept rather than fabricating future implementation.

---

## 32. Final Contribution Principle

> Preserve canonical truth, security boundaries, provenance, and controlled architecture even when a local shortcut would be easier.

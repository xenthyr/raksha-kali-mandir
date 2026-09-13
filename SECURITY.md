# Security Policy

## 1. Scope

This document defines the repository-level security policy for the V1.1.3 clean-slate reconstruction of **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

It governs:

- canonical-data integrity;
- public/private serialization;
- authentication;
- authorization;
- session security;
- committee identity and role security;
- support-ticket tracking;
- attachments;
- Backblaze B2 storage;
- donation/finance workflows;
- email and webhooks;
- search and AI;
- PWA/client caching;
- logging/audit;
- environment separation;
- incident response;
- dependency and development security.

---

## 2. Security Objectives

The security architecture protects:

1. **Confidentiality** — private information remains private.
2. **Integrity** — canonical data and security-sensitive state cannot be silently or unauthorizedly changed.
3. **Availability** — public functionality remains useful despite optional integration failures.
4. **Authenticity** — identities, webhooks, workflow transitions, and source states are verified.
5. **Auditability** — material security-sensitive actions remain investigable.

---

## 3. Security Architecture

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

Administrative mutation:

```text
Actor
  ↓
Authentication
  ↓
Authorization
  ↓
Input Validation
  ↓
Workflow / Approval
  ↓
Canonical Persistence
  ↓
Revision / Audit
  ↓
Publication / Revalidation
```

Security enforcement belongs at the protected operation boundary.

Client-side behavior is never an authorization boundary.

---

## 4. Canonical Committee Security Lock

The current canonical roster contains nine current `TERM-0001` people:

| Person ID | Current position | Role ID |
|---|---|---|
| `PERSON-000001` | সভাপতি / President | `ROLE-PRESIDENT` |
| `PERSON-000002` | সম্পাদক / Secretary | `ROLE-SECRETARY` |
| `PERSON-000003` | কোষাধ্যক্ষ / Cashier | `ROLE-CASHIER` |
| `PERSON-000004` | সহ-কোষাধ্যক্ষ / Assistant Cashier | `ROLE-ASSISTANT-CASHIER` |
| `PERSON-000005` | মিডিয়া দায়িত্বপ্রাপ্ত / Media | `ROLE-MEDIA` |
| `PERSON-000006` | কার্যকরী সদস্য / Executive Member | `ROLE-EXECUTIVE-MEMBER` |
| `PERSON-000007` | সাংগঠনিক সম্পাদক / Organizing Secretary | `ROLE-ORGANIZING-SECRETARY` |
| `PERSON-000008` | সহকারী সম্পাদক / Assistant Secretary | `ROLE-ASSISTANT-SECRETARY` |
| `PERSON-000009` | প্রতিষ্ঠাকালীন অংশগ্রহণকারী / Founding Participant | `ROLE-FOUNDING-PARTICIPANT` |

The following four positions are separately recorded as vacant:

```text
Vice President
Joint Secretary
Office Secretary
Volunteer Coordinator
```

Security-sensitive authorization code must not collapse these states into one generic committee flag.

`PERSON-000007` / Mintu Shil is the current Organizing Secretary. That role is filled and must not be treated as vacant.

---

## 5. Canonical Identity Integrity

Protected identities include:

```text
TEMPLE-0001
DEITY-0001
LOCATION-0001
COMMITTEE-0001
TERM-0001
PANJIKA-Y1433
PERSON-000001 ... PERSON-000009
```

Do not infer identity from:

- display name;
- filename;
- array position;
- UI ordering;
- role string;
- historical prose.

Canonical role assignments must use stable IDs.

---

## 6. Public / Private Boundary

Public data is explicitly approved for publication.

Private data may include:

- private contact values;
- authentication records;
- session identifiers;
- password material;
- reset secrets;
- private committee details;
- internal ticket fields;
- private attachments;
- donor-sensitive information;
- risk flags;
- audit-only information;
- infrastructure credentials;
- provider credentials.

Use explicit public serializers.

Do not expose a complete private object and attempt to subtract sensitive fields after serialization.

---

## 7. Secret Management

Never commit:

- B2 application keys;
- `AUTH_SECRET`;
- Turnstile secret;
- VAPID private key;
- AI provider API key;
- Resend API key;
- Jaba/OTP provider configuration;
- identity salts;
- private signing secrets;
- production database credentials;
- other server-only credentials.

`.env.example` may contain variable names and safe examples but never production secrets.

Never print secrets to:

- logs;
- browser consoles;
- error pages;
- support tickets;
- CI output;
- analytics payloads.

---

## 8. Client / Server Isolation

Server-only modules must remain server-side.

Do not import into client code:

- database clients;
- private storage credentials;
- email-provider secrets;
- authentication secrets;
- signing secrets;
- privileged AI credentials;
- server-only configuration.

Client bundles must contain only intentionally public configuration.

---

## 9. Authentication

Administrative authentication uses:

```text
username OR registered phone
+
password
```

First-login lifecycle:

```text
temporary credential
→ required setup
→ phone binding/confirmation
→ private password
→ server-managed session
```

Do not use public signup for administrative accounts.

Do not replace the controlled administrative identity model with an uncontrolled social-login mechanism.

Passwords are never stored plaintext.

---

## 10. Session Security

Sessions are server-managed.

Security properties should include, as applicable:

- `Secure`;
- `HttpOnly`;
- `SameSite`;
- suitable expiry;
- revocation;
- account disable handling.

Session identifiers are opaque.

Do not expose sessions in URLs or logs.

High-risk operations may require reauthentication.

---

## 11. Password Reset

Password-reset tokens must be:

- short-lived;
- single-use;
- opaque;
- hashed when persisted;
- rate-limited;
- safely expired.

Do not log reset tokens.

User-facing responses should avoid unnecessary account-existence enumeration.

---

## 12. Authorization

Authorization follows:

```text
Authenticated actor
  ↓
Active role assignments
  ↓
Permission set
  ↓
Resource/scope
  ↓
Policy
  ↓
Audit
```

Server-side permission checks are authoritative.

UI restrictions do not authorize actions.

Role possession is not the same as unrestricted access.

Sensitive actions may require explicit approval or reauthentication.

---

## 13. Finance Separation

Finance is segregated from ordinary publication permissions.

The financial lifecycle separates:

```text
Intent
→ submitted payment reference
→ verification
→ approval
→ posting
```

A UTR is not payment verification.

Never treat a client-submitted UTR as proof of verified payment.

Canonical donation baseline:

```text
VPA = 7583992377@okbizaxis
Payee = Sri Sri Raksha Kali Mandir
Minimum = ₹11
Suggestions = ₹51 / ₹101 / ₹501 / ₹1001
```

Financial mutations should be auditable.

---

## 14. Support Ticket Security

Ticket reference:

```text
MRK-YYYY-NNNNNN
```

Private tracking requires:

```text
reference + 4-digit PIN
```

The reference alone is not authorization.

PIN requirements:

- never store plaintext;
- use secure verification;
- rate-limit attempts;
- avoid revealing private ticket state on failure.

Private fields include, as applicable:

- internal notes;
- assignments;
- risk flags;
- private attachments;
- identity hashes;
- private contact information.

Public tracking must use an explicit public view model.

---

## 15. Upload Security

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

### Videos

```text
2 files max
50 MB/file
100 MB aggregate
```

### Audio

```text
2 files max
25 MB/file
```

### Documents

```text
5 files max
15 MB/file
```

Security enforcement follows:

```text
Request
 ↓
Authentication / authorization where required
 ↓
Metadata validation
 ↓
File-count/size validation
 ↓
Type validation
 ↓
Upload issuance
 ↓
Object upload
 ↓
Server finalization
 ↓
Reconciliation/scanning where required
```

Browser validation alone is not sufficient.

---

## 16. Backblaze B2 Security

Production object storage:

```text
Provider = Backblaze B2
Bucket = raksha-kali-mandir-storage
Bucket ID = 48a58aafc4e2931aaf030011
Region = eu-central-003
Endpoint = https://s3.eu-central-003.backblazeb2.com
Access = private
```

Credentials remain server-side.

Private objects must not be unintentionally public.

Temporary access should be:

- short-lived;
- scoped;
- permission-checked.

The current V1.1.3 production target does not use Cloudflare R2.

---

## 17. Email Security

The email adapter is Resend.

Current operations address configuration:

```text
maarakshakalisahapur@gmail.com
```

The supplied primary and backup values are the same; do not produce duplicate mail merely because two slots contain the same destination.

Production sending requires a verified sender domain.

Development/preview must not accidentally send production mail.

---

## 18. Webhook Security

Treat external webhook requests as untrusted until authenticated.

Processing order:

```text
Request
 ↓
Authenticity verification
 ↓
Schema validation
 ↓
Duplicate/replay protection
 ↓
State-transition validation
 ↓
Durable mutation
 ↓
Audit/observability
```

Never mutate durable state before authenticity verification.

Duplicate and out-of-order events must be safe to process.

---

## 19. Rate Limiting

Rate-limit sensitive endpoints such as:

- login;
- password reset;
- ticket tracking;
- verification operations;
- sensitive public submissions;
- enumeration-prone endpoints.

Rate limiting must be enforced server-side.

Do not reveal internal counters or private account-existence information.

---

## 20. Search and AI Security

Search must include only content allowed for public indexing.

AI context must obey:

- publication state;
- verification;
- provenance;
- historical status;
- public/private classification;
- authorization.

AI must never:

- reveal private records;
- bypass authorization;
- invent canonical facts;
- create an alternate canonical source;
- mutate canonical data through ordinary public chat.

Public functionality must remain usable without AI.

---

## 21. PWA and Browser Storage

Do not place private information into public caches.

Do not cache:

- authenticated API results;
- admin pages;
- private ticket responses;
- private attachments;
- sessions;
- secrets.

Review all browser storage surfaces:

- service-worker Cache Storage;
- localStorage;
- sessionStorage;
- IndexedDB.

Caching must never bypass server authorization.

---

## 22. Panjika Integrity

The current Panjika security/integrity lock is:

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 records
CANONICAL_REGIONAL_CALCULATION
```

The temple physical coordinates are:

```text
25.661726
88.103574
```

They do not replace the Raiganj Panjika calculation basis.

Do not silently recompute supplied astronomical values.

---

## 23. Business Time and Expiry

Business-time interpretation uses:

```text
Asia/Kolkata
```

Persisted instants may use UTC where appropriate.

Security-sensitive expiry logic must not depend on client-provided time.

Scheduled operations must be idempotent.

---

## 24. Logging and Audit

Never log:

- passwords;
- reset tokens;
- session secrets;
- API keys;
- B2 credentials;
- Resend keys;
- private attachment contents.

Security-relevant audit events may include:

- administrative login success/failure;
- password-reset issuance/use;
- account disable/revoke;
- permission changes;
- support state changes;
- publication changes;
- private-object access;
- webhook verification failures;
- suspicious rate-limit activity;
- security-sensitive configuration changes.

Audit data itself must be access-controlled.

---

## 25. Error Handling

Security-sensitive failures must fail closed.

Examples:

```text
No authentication → deny
No permission → deny
Invalid PIN → deny
Invalid webhook signature → reject before mutation
Invalid upload → reject
Malformed canonical record → reject
Unavailable authorization state → deny rather than guess
```

Do not silently continue after a security-sensitive failure.

---

## 26. Dependency Security

The committed lockfile defines the reproducible dependency graph.

Dependency changes must consider:

- security advisories;
- transitive dependencies;
- framework compatibility;
- Node.js compatibility;
- OpenNext compatibility;
- Cloudflare compatibility.

Do not disable security checks to obtain a green build.

Do not force upgrades without compatibility review.

---

## 27. Environment Security

Production and preview are separate.

Production secrets must never appear in:

- Git;
- client bundles;
- public artifacts;
- public logs.

Preview must not silently obtain production mutation authority.

The production storage target is B2, not R2.

---

## 28. Development Security

Developers must:

- use safe local templates;
- avoid production secrets in development;
- use deterministic fixtures;
- avoid uncontrolled live production services in unit tests;
- inspect diffs for secret leakage;
- inspect client/server boundaries;
- preserve canonical identifiers;
- preserve current committee roles;
- preserve vacant-position status;
- preserve Panjika calculation basis.

---

## 29. Incident Response

When a security incident is suspected:

1. stop or isolate the unsafe operation where possible;
2. identify affected environment(s);
3. preserve relevant audit information;
4. revoke/rotate compromised credentials;
5. invalidate affected sessions/tokens;
6. restrict compromised object access;
7. determine affected data;
8. correct the underlying control;
9. validate the fix;
10. record corrective action.

Do not destroy useful investigation evidence before preserving it appropriately.

---

## 30. Credential Compromise

If any secret is exposed:

- treat it as compromised immediately;
- revoke/rotate it;
- inspect use logs;
- invalidate dependent sessions/tokens where applicable;
- replace and verify configuration;
- record the incident.

Deleting a Git commit alone is not adequate remediation.

---

## 31. Vulnerability Reporting

Security vulnerabilities should be reported privately when public disclosure could enable exploitation.

Useful reports include:

- affected component;
- reproduction;
- expected vs actual behavior;
- security impact;
- version/environment;
- mitigation where known.

Never include:

- passwords;
- API keys;
- session secrets;
- private ticket contents;
- private attachments;
- production credentials.

---

## 32. Security Review Per Batch

For each controlled batch, verify as applicable:

- no secret leakage;
- no server-only module enters client code;
- no private field enters public serializers;
- no unauthorized route mutation;
- no public object leak;
- no canonical-ID drift;
- no committee-role drift;
- no Panjika calculation-basis drift;
- no vacancy-state drift;
- no new non-idempotent retry path;
- no silently swallowed security failure.

---

## 33. Production Security Gate

Before production release, the applicable gates must pass:

- secret scan;
- dependency/security checks;
- D1 migration integrity;
- auth/session security;
- server-side RBAC;
- support tracking security;
- upload enforcement;
- private B2 isolation;
- email sender verification;
- webhook authenticity;
- Panjika 216-row integrity;
- publication filtering;
- AI/public boundary;
- PWA/private-cache checks;
- accessibility/security tests;
- backup/restore;
- release/rollback.

A failed gate requires correction or a formal exception record.

---

## 34. Core Security Principle

> **Never trust presentation state where a server-side security decision is required.**

Protect canonical truth, identity, authorization, private data, object access, workflow state, and external integrations independently.

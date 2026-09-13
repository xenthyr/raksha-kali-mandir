# Security Policy

## 1. Scope

This document defines the repository-level security policy for the V1.1.3 clean-slate reconstruction of **শ্রী শ্রী মা রক্ষা কালী মন্দির**.

## Frozen source locks

Security implementation decisions for this reconstruction are governed by the following supplied artifacts:

```text
V1.1.3 blueprint
33a700891da9fe58cee906f04d2d2260f9e0fcb812da430501ba3542a135386a

V2.1.1 canonical source-data master
57c90c1b849cfb1f9591ff1cc63e4bbb29e05ced9740c70b1518892ceb3ce5c0

1433 Panjika
6dc5cf755cb2f54a9884aa50c1d2cd486052d679054e3a9f31350e34e87be246
```

It governs security expectations for:

- source and canonical data;
- public/private serialization;
- authentication;
- authorization;
- sessions;
- administrative access;
- support-ticket tracking;
- attachments and object storage;
- donation/finance workflows;
- transactional email and webhooks;
- search and AI;
- PWA/client caching;
- logging and audit;
- environment separation;
- incident response;
- dependency and development security.

This policy complements the detailed security contracts and later domain-specific documentation.

---

## 2. Security Objectives

The security architecture must preserve five primary properties:

1. **Confidentiality** — private information remains private.
2. **Integrity** — canonical data and security-sensitive state cannot be silently or unauthorizedly changed.
3. **Availability** — public functionality remains useful even when optional integrations fail.
4. **Authenticity** — authentication, webhooks, sources, and workflow transitions are verified.
5. **Auditability** — security-sensitive actions can be investigated with appropriate access control.

---

## 3. Security Architecture

The system follows:

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

Administrative mutations follow:

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

Security enforcement belongs close to the protected operation.

Client-side behavior is never an authorization boundary.

---

## 4. Canonical Data Integrity

Canonical identities include, among others:

```text
TEMPLE-0001
DEITY-0001
LOCATION-0001
PANJIKA-Y1433
```

Current committee mappings include:

```text
PERSON-000006 → ROLE-EXECUTIVE-MEMBER
PERSON-000007 → ROLE-ORGANIZING-SECRETARY
PERSON-000008 → ROLE-ASSISTANT-SECRETARY
```

Security-sensitive code must not infer identity from:

- display name;
- filename;
- array order;
- position in a list;
- role name alone;
- historical prose.

Canonical records must preserve the provenance, verification, revision, publication, and audit information required by their domain.

Input validation must reject malformed and contradictory records rather than allowing ambiguous data to reach a trusted state.

---

## 5. Secret Management

The following are server-side secrets and must never be committed to Git or exposed to browser code:

- B2 application keys;
- `AUTH_SECRET`;
- Turnstile secret;
- VAPID private key;
- AI provider API key;
- error-reporting DSN where confidential;
- Resend API key;
- Jaba/OTP provider configuration;
- identity salts;
- rate-limit secrets/configuration where confidential;
- private media signing secrets;
- database credentials where applicable.

`.env.example` may document variable names and safe non-secret defaults.

It must not contain real production credentials.

Do not print secrets in:

- CI logs;
- application logs;
- error pages;
- support tickets;
- browser console;
- analytics payloads;
- exception messages.

---

## 6. Client / Server Separation

Server-only modules must remain server-side.

Do not import server-only secrets, database clients, storage credentials, or privileged services into client components.

Client bundles must not contain:

- database credentials;
- object-storage credentials;
- email provider keys;
- authentication secrets;
- password reset secrets;
- private signing material;
- privileged AI provider credentials.

Public serializers must be explicit allow-lists.

The safe pattern is:

```text
Private record
  ↓
Explicit public serializer
  ↓
Approved public fields only
```

Never:

```text
Private record
  ↓
Return everything
  ↓
Remove a few fields later
```

---

## 7. Authentication

Administrative authentication is limited to canonical committee identities and the approved account lifecycle.

The target authentication model is:

```text
username OR registered phone
        +
password
```

First login:

```text
Temporary credential
  ↓
Required setup
  ↓
Phone binding/confirmation
  ↓
Private password establishment
  ↓
Normal session lifecycle
```

The system does not use public signup, social login, or Google OAuth as an administrative identity mechanism.

Only one implemented and versioned password-KDF policy should be used.

Passwords are never stored in plaintext.

---

## 8. Session Security

Sessions are server-managed.

Session cookies must use appropriate security properties, including where applicable:

- `Secure`;
- `HttpOnly`;
- `SameSite`;
- appropriate expiration;
- server-side revocation/disable controls.

Session identifiers must be opaque.

Do not expose session secrets through URLs, logs, client data, or public APIs.

Session expiration and revocation must be honored server-side.

High-risk actions may require reauthentication according to policy.

---

## 9. Password Reset

Password-reset controls must use:

- short-lived tokens;
- single-use tokens;
- opaque externally visible values;
- hashed token storage where persisted;
- rate limiting;
- safe expiration;
- account-state checks.

Reset tokens must never be logged in plaintext.

The user-facing response must not reveal whether a sensitive account identifier exists where doing so could enable account enumeration.

---

## 10. Authorization

Authorization is resolved as:

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

Every administrative mutation must verify the authenticated actor and permission on the server.

Role membership does not automatically grant every operation.

A super-admin style role does not bypass:

- cryptographic secrets;
- source validation;
- integrity constraints;
- required approvals;
- audit;
- explicit confirmations.

Separation-of-duty exceptions must be explicit and auditable.

---

## 11. Public / Private Data Security

Public and private data models must remain separate.

Examples of private fields include:

- private phone/email;
- private notes;
- internal risk flags;
- authentication data;
- admin identifiers;
- unpublished term information;
- internal approval commentary;
- donor-sensitive information;
- identity hashes;
- private prayer purpose;
- private attachments.

Public serializers may expose only approved fields.

Search and AI must apply the same publication and privacy rules.

---

## 12. Support Ticket Security

Public ticket tracking uses:

```text
ticket reference + 4-digit PIN
```

The ticket reference alone is not authorization.

Ticket references use:

```text
MRK-YYYY-NNNNNN
```

Ticket creation must be collision-safe through the D1 data layer.

Tracking requests must be rate-limited and protected against brute-force discovery.

The PIN must never be stored plaintext.

Public tracking must not expose:

- internal notes;
- assignments;
- internal risk flags;
- private attachments;
- identity hashes;
- private contact information;
- other non-public fields.

Public tracking should use explicit public view models rather than querying and serializing the full ticket object.

---

## 13. Upload Security

Server-side validation is authoritative.

The system must enforce both per-file and aggregate limits.

### Grievance

- maximum 3 attachments;
- maximum 5 MB each;
- maximum 10 MB aggregate;
- JPEG/PNG/WebP/PDF;
- video disabled.

### Committee photos

- maximum 10;
- maximum 5 MB each;
- maximum 50 MB aggregate.

### Committee videos

- maximum 2;
- maximum 50 MB each;
- maximum 100 MB aggregate.

### Committee audio

- maximum 2;
- maximum 25 MB each.

### Committee documents

- maximum 5;
- maximum 15 MB each.

The validation chain is:

```text
Request
  ↓
Authentication/authorization where required
  ↓
Metadata validation
  ↓
File count/size validation
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

Browser validation alone is insufficient.

---

## 14. Object Storage Security

The production object-storage target is Backblaze B2:

```text
Bucket: raksha-kali-mandir-storage
Bucket ID: 48a58aafc4e2931aaf030011
Region: eu-central-003
Endpoint: https://s3.eu-central-003.backblazeb2.com
Access: private
```

Credentials are server-side only.

Private objects must not become public through uncontrolled URLs.

Temporary URLs are bearer credentials and must therefore be:

- short-lived;
- scoped;
- permission-checked;
- generated only when appropriate.

Do not place permanent storage credentials in the browser.

Do not reintroduce executable R2 paths into V1.1.3 production code.

---

## 15. Donation / Finance Security

Donation workflows must distinguish:

```text
Donation intent
  ↓
Submitted payment reference
  ↓
Verification
  ↓
Approval
  ↓
Posting
```

A UTR is not payment verification.

The canonical donation configuration includes:

```text
VPA: 7583992377@okbizaxis
Payee: Sri Sri Raksha Kali Mandir
Minimum: ₹11
Suggestions: ₹51 / ₹101 / ₹501 / ₹1001
```

Finance mutation permissions remain separated from ordinary content-publishing permissions.

Financial actions should be auditable.

Client-submitted values are never treated as verified merely because they are well-formed.

---

## 16. Email Security

The email layer uses Resend.

Production sending must use a provider-verified sender domain.

Development and preview environments must not accidentally send production mail.

Webhook processing must:

1. verify authenticity before mutation;
2. validate event structure;
3. tolerate duplicate events;
4. tolerate out-of-order delivery where applicable;
5. avoid replaying side effects;
6. persist or reconcile provider state safely.

A provider failure must not erase a durable ticket or canonical record.

The currently supplied primary and backup operations addresses are identical:

```text
maarakshakalisahapur@gmail.com
```

The application must not treat the duplicate configuration as two unique destinations.

---

## 17. Webhook Security

A webhook is an untrusted external request until authenticated.

The processing order is:

```text
Request
  ↓
Signature/authenticity verification
  ↓
Schema validation
  ↓
Replay/duplicate protection
  ↓
State transition validation
  ↓
Durable mutation
  ↓
Audit/observability
```

Do not mutate state before authenticity verification.

Do not trust provider event IDs solely because they are syntactically valid.

---

## 18. Rate Limiting

Sensitive public endpoints should be rate-limited, including where applicable:

- login;
- password reset requests;
- ticket tracking;
- sensitive contact/grievance operations;
- verification endpoints;
- webhook abuse surfaces;
- other enumeration-prone endpoints.

Rate limits must be enforced server-side.

When a public rate-limited endpoint fails due to abuse controls, the response should avoid exposing internal counters or sensitive account existence information.

---

## 19. Search and AI Security

Search indexes only approved public content.

AI grounding may use only data allowed by:

- publication state;
- verification state;
- public/private classification;
- source/provenance rules;
- authorization requirements.

AI must not:

- reveal private records;
- bypass admin authorization;
- use hidden fields as public context;
- invent canonical facts;
- become a canonical database;
- mutate canonical data through ordinary public chat.

The application must remain operational when AI is unavailable.

---

## 20. PWA / Browser Storage Security

Do not cache or persist private information in public service-worker caches.

Do not cache:

- admin pages;
- authenticated API responses;
- ticket details;
- private attachments;
- sessions;
- secrets.

Review browser storage use carefully for:

- localStorage;
- sessionStorage;
- IndexedDB;
- service-worker Cache Storage.

Private authentication state should remain under the approved secure session model.

---

## 21. Logging and Observability

Logs should support investigation without becoming a secondary source of sensitive data.

Never log:

- passwords;
- reset tokens;
- session secrets;
- API keys;
- B2 secrets;
- Resend keys;
- authentication cookies;
- private attachment contents.

Security-relevant events that may need audit/observability include:

- successful/failed administrative login;
- password-reset issuance/use;
- account disable/revoke;
- permission changes;
- support-ticket state changes;
- private-object access;
- publication changes;
- webhook verification failures;
- suspicious rate-limit events;
- security-sensitive configuration changes.

Audit records must themselves be access-controlled.

---

## 22. Canonical and Panjika Security

Calendar data is integrity-sensitive.

The current Panjika contract is:

```text
PANJIKA-Y1433
Bisuddha Siddhanta
CALC-BS1433-RAIGANJ-V1
2026-09-11..2027-04-14
216 records
```

The physical temple coordinates:

```text
25.661726, 88.103574
```

must not replace the Raiganj calculation basis.

Do not silently recompute the supplied 216 astronomical rows.

The production-update correction changes the daily calculation-status metadata to:

```text
CANONICAL_REGIONAL_CALCULATION
```

while preserving the supplied astronomical values.

---

## 23. Security and Business Time

Business-time logic must use:

```text
Asia/Kolkata
```

Persisted instants may be UTC where appropriate.

Conversions must be explicit.

Scheduled jobs must be idempotent.

Security-sensitive expiry logic must use a consistent server-side clock and avoid client-provided time as an authority.

---

## 24. Error Handling

Security failures must fail closed.

Examples:

- unauthenticated admin request → deny;
- insufficient permission → deny;
- malformed canonical record → reject;
- invalid ticket PIN → deny without revealing private state;
- invalid webhook signature → reject before mutation;
- invalid upload type/size → reject;
- unavailable authorization state → deny rather than guess.

Do not silently continue after security-sensitive errors.

---

## 25. Dependency Security

The dependency graph is controlled through the committed lockfile.

Dependency work must consider:

- known vulnerabilities;
- framework compatibility;
- runtime compatibility;
- Cloudflare/OpenNext compatibility;
- package provenance;
- transitive dependencies.

Do not use forced upgrades without compatibility review.

Do not bypass security warnings by disabling checks.

---

## 26. Development Security Rules

Developers must:

- keep secrets out of Git;
- use safe local environment templates;
- avoid production credentials in tests;
- use deterministic fixtures;
- avoid live production services in unit tests;
- inspect diffs for secret leakage;
- inspect client bundles for server-only imports;
- preserve public/private boundaries;
- preserve canonical identifiers;
- preserve Panjika basis;
- preserve committee roles;
- preserve B2 storage target.

---

## 27. Incident Response

When a security incident is suspected:

1. stop the unsafe operation where possible;
2. identify affected environments;
3. preserve relevant audit information;
4. revoke or rotate compromised credentials;
5. invalidate affected sessions/tokens;
6. restrict compromised object access;
7. determine affected data;
8. repair the underlying control;
9. validate the repair;
10. document impact and corrective action.

Do not destroy relevant evidence before investigation.

---

## 28. Credential Compromise

If a secret or credential is exposed:

- treat it as compromised immediately;
- revoke/rotate it;
- remove it from exposed channels;
- inspect logs for use;
- invalidate affected sessions/tokens where applicable;
- verify the replacement configuration;
- record the incident and corrective action.

Do not rely on deleting the Git commit alone as remediation.

---

## 29. Vulnerability Reporting

Security vulnerabilities should not be disclosed publicly when the disclosure itself could enable exploitation.

A useful report should contain:

- affected component;
- reproduction steps;
- expected vs actual behavior;
- security impact;
- environment/version information;
- mitigation suggestions when available.

Do not include:

- passwords;
- API keys;
- private user data;
- private tickets;
- private attachments;
- production credentials.

---

## 30. Security Review Per Batch

Every controlled batch must include a security review appropriate to its scope.

At minimum, the review should ask:

- Did any secret enter the repository?
- Did any server-only dependency enter client code?
- Did any public serializer gain private fields?
- Did any authentication or authorization boundary weaken?
- Did any object become unintentionally public?
- Did any canonical fact drift?
- Did any Panjika value or calculation basis drift?
- Did any committee role drift?
- Did any new retryable mutation become non-idempotent?
- Did any error become silently swallowed?
- Did any preview path gain production access?

---

## 31. Production Security Gate

Production release must not proceed until the applicable security gates pass, including where applicable:

- clean tree;
- no secret leakage;
- dependency/security checks;
- D1 migration integrity;
- server-side authorization;
- session security;
- password-reset security;
- support tracking security;
- upload limits;
- private-object isolation;
- email webhook authenticity;
- environment separation;
- search/AI publication filtering;
- PWA/private-cache checks;
- accessibility/security tests;
- backup/restore validation;
- release/rollback validation.

A failed gate requires a fix or an explicit, recorded exception with owner, date, scope, risk, and reason.

---

## 32. Core Security Principle

The repository follows this rule:

> **Never trust presentation state where a server-side security decision is required.**

Security belongs at the data and mutation boundaries.

Canonical truth, private data, authenticated identity, authorization, object access, workflow state, and external webhooks must all be independently protected.

-- Batch 008 / 005_governance.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- D1/SQLite governance, approvals, provenance, revisions and audit schema.
-- PERSON-* identifies people; USER-* identifies administrative login identities.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS committee_members (
    id TEXT PRIMARY KEY,
    committee_id TEXT NOT NULL,
    committee_term_id TEXT NOT NULL,
    person_id TEXT NOT NULL,
    membership_type TEXT NOT NULL DEFAULT 'MEMBER'
        CHECK (membership_type IN ('MEMBER', 'FOUNDING_PARTICIPANT', 'ADVISOR', 'HONORARY')),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'CLOSED')),
    valid_from TEXT NOT NULL,
    valid_to TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (committee_id) REFERENCES committees(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (committee_term_id) REFERENCES committee_terms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (person_id) REFERENCES persons(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (valid_to IS NULL OR valid_to >= valid_from),
    UNIQUE (committee_term_id, person_id)
);

CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY,
    committee_id TEXT NOT NULL,
    committee_term_id TEXT,
    meeting_number TEXT NOT NULL,
    meeting_type TEXT NOT NULL DEFAULT 'REGULAR'
        CHECK (meeting_type IN ('REGULAR', 'SPECIAL', 'EMERGENCY', 'PREPARATION', 'ANNUAL')),
    title_bn TEXT NOT NULL,
    title_en TEXT,
    status TEXT NOT NULL DEFAULT 'PLANNED'
        CHECK (status IN ('PLANNED', 'SCHEDULED', 'HELD', 'CANCELLED', 'ARCHIVED')),
    scheduled_at TEXT,
    held_at TEXT,
    location_text TEXT,
    minutes_bn TEXT,
    minutes_en TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (committee_id) REFERENCES committees(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (committee_term_id) REFERENCES committee_terms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (committee_id, meeting_number)
);

CREATE TABLE IF NOT EXISTS resolutions (
    id TEXT PRIMARY KEY,
    meeting_id TEXT,
    committee_id TEXT NOT NULL,
    committee_term_id TEXT,
    resolution_number TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    body_bn TEXT NOT NULL,
    body_en TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PROPOSED', 'ADOPTED', 'REJECTED', 'SUPERSEDED', 'ARCHIVED')),
    proposed_at TEXT,
    adopted_at TEXT,
    proposed_by_user_id TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meeting_id) REFERENCES meetings(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (committee_id) REFERENCES committees(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (committee_term_id) REFERENCES committee_terms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (proposed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (committee_id, resolution_number),
    CHECK (adopted_at IS NULL OR proposed_at IS NULL OR adopted_at >= proposed_at)
);

CREATE TABLE IF NOT EXISTS approval_policies (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT,
    required_permission TEXT NOT NULL,
    minimum_approvals INTEGER NOT NULL DEFAULT 1 CHECK (minimum_approvals >= 1),
    dual_approval_required INTEGER NOT NULL DEFAULT 0 CHECK (dual_approval_required IN (0, 1)),
    target_entity_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS approvals (
    id TEXT PRIMARY KEY,
    policy_id TEXT NOT NULL,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    approver_user_id TEXT NOT NULL,
    decision TEXT NOT NULL CHECK (decision IN ('APPROVED', 'REJECTED', 'WITHDRAWN')),
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    decision_reason_private TEXT,
    idempotency_key TEXT NOT NULL UNIQUE,
    decided_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    source_id TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (policy_id) REFERENCES approval_policies(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (approver_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (target_entity_type, target_entity_id, policy_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS sources (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('PROJECT_OWNER', 'OFFICIAL_TEMPLE', 'OFFICIAL_NOTICE', 'OFFICIAL_WEB', 'PANJIKA', 'ARCHIVE', 'HISTORICAL', 'EXTERNAL')),
    title TEXT NOT NULL,
    uri TEXT,
    published_at TEXT,
    accessed_at TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'INVALID')),
    confidence TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (confidence IN ('UNVERIFIED', 'LOW', 'MEDIUM', 'HIGH', 'VERIFIED')),
    checksum_sha256 TEXT,
    notes_private TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS source_snapshots (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    snapshot_version INTEGER NOT NULL CHECK (snapshot_version >= 1),
    captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    content_hash_sha256 TEXT NOT NULL,
    storage_reference_private TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUPERSEDED', 'ARCHIVED', 'INVALID')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES sources(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (source_id, snapshot_version),
    UNIQUE (content_hash_sha256)
);

CREATE TABLE IF NOT EXISTS revisions (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_revision_id TEXT,
    version INTEGER NOT NULL CHECK (version >= 1),
    before_json_private TEXT,
    after_json_private TEXT,
    change_reason TEXT NOT NULL,
    actor_user_id TEXT,
    source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (previous_revision_id) REFERENCES revisions(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (source_id) REFERENCES sources(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (entity_type, entity_id, version)
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT,
    actor_role_code TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    result TEXT NOT NULL CHECK (result IN ('SUCCESS', 'DENIED', 'CONFLICT', 'INVALID', 'NOT_FOUND', 'FAILURE')),
    before_json_private TEXT,
    after_json_private TEXT,
    reason_private TEXT,
    request_id TEXT,
    source_id TEXT,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (source_id) REFERENCES sources(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS consent_records (
    id TEXT PRIMARY KEY,
    subject_type TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    consent_type TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('GRANTED', 'WITHDRAWN', 'EXPIRED')),
    policy_version TEXT NOT NULL,
    captured_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    withdrawn_at TEXT,
    evidence_reference_private TEXT,
    source_id TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_committee_members_term_status
    ON committee_members (committee_term_id, status, valid_from);
CREATE INDEX IF NOT EXISTS idx_committee_members_person_status
    ON committee_members (person_id, status);
CREATE INDEX IF NOT EXISTS idx_meetings_committee_status
    ON meetings (committee_id, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_resolutions_committee_status
    ON resolutions (committee_id, status, adopted_at);
CREATE INDEX IF NOT EXISTS idx_approvals_target
    ON approvals (target_entity_type, target_entity_id, decision, decided_at);
CREATE INDEX IF NOT EXISTS idx_approvals_approver
    ON approvals (approver_user_id, decided_at);
CREATE INDEX IF NOT EXISTS idx_sources_status_type
    ON sources (status, source_type);
CREATE INDEX IF NOT EXISTS idx_source_snapshots_source
    ON source_snapshots (source_id, captured_at);
CREATE INDEX IF NOT EXISTS idx_revisions_entity
    ON revisions (entity_type, entity_id, version);
CREATE INDEX IF NOT EXISTS idx_revisions_actor
    ON revisions (actor_user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_time
    ON audit_logs (actor_user_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_time
    ON audit_logs (entity_type, entity_id, occurred_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_result_time
    ON audit_logs (result, occurred_at);
CREATE INDEX IF NOT EXISTS idx_consent_subject
    ON consent_records (subject_type, subject_id, consent_type, status);

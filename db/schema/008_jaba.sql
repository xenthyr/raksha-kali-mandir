-- Batch 009 / 008_jaba.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Daily Jaba and Monthly Amavasya Jaba are distinct first-class domains.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS jaba_offerings (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('DAILY_JABA', 'MONTHLY_AMAVASYA_JABA')),
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    no_donation_required INTEGER NOT NULL DEFAULT 1 CHECK (no_donation_required IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS jaba_offering_cycles (
    id TEXT PRIMARY KEY,
    offering_id TEXT NOT NULL,
    amavasya_id TEXT NOT NULL,
    cycle_slug TEXT NOT NULL UNIQUE,
    opens_at TEXT NOT NULL,
    near_capacity_at TEXT,
    cutoff_at TEXT,
    closes_at TEXT,
    roster_lock_at TEXT,
    capacity INTEGER CHECK (capacity IS NULL OR capacity > 0),
    state TEXT NOT NULL DEFAULT 'PLANNED'
        CHECK (state IN ('PLANNED', 'OPEN', 'NEAR_CAPACITY', 'CUTOFF_PENDING', 'CLOSED', 'ROSTER_LOCKED', 'PUJA_PERFORMED', 'COMPLETED', 'ARCHIVED')),
    verified_participant_count INTEGER NOT NULL DEFAULT 0 CHECK (verified_participant_count >= 0),
    ritual_completion_state TEXT NOT NULL DEFAULT 'NOT_PERFORMED'
        CHECK (ritual_completion_state IN ('NOT_PERFORMED', 'PERFORMED', 'COMPLETED')),
    committee_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (committee_confirmed IN (0, 1)),
    archive_publication_state TEXT NOT NULL DEFAULT 'NOT_PUBLISHED'
        CHECK (archive_publication_state IN ('NOT_PUBLISHED', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    linked_media_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_media_ids_json)),
    linked_notice_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_notice_ids_json)),
    linked_social_card_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_social_card_ids_json)),
    source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    FOREIGN KEY (offering_id) REFERENCES jaba_offerings(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (amavasya_id) REFERENCES amavasyas(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (near_capacity_at IS NULL OR near_capacity_at >= opens_at),
    CHECK (cutoff_at IS NULL OR cutoff_at >= opens_at),
    CHECK (closes_at IS NULL OR cutoff_at IS NULL OR closes_at >= cutoff_at),
    CHECK (roster_lock_at IS NULL OR closes_at IS NULL OR roster_lock_at >= closes_at),
    UNIQUE (amavasya_id)
);

CREATE TABLE IF NOT EXISTS jaba_participants (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    display_name_public TEXT,
    gotra TEXT,
    rashi TEXT,
    nakshatra TEXT,
    prayer_purpose TEXT,
    email_private TEXT,
    phone_private TEXT,
    special_instructions_private TEXT,
    anonymous_public INTEGER NOT NULL DEFAULT 1 CHECK (anonymous_public IN (0, 1)),
    verified_identity_key TEXT,
    identity_key_version TEXT,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'BLOCKED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jaba_participants_identity
    ON jaba_participants (verified_identity_key, status);

CREATE TABLE IF NOT EXISTS jaba_submissions (
    id TEXT PRIMARY KEY,
    cycle_id TEXT,
    participant_id TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('DAILY_JABA', 'MONTHLY_AMAVASYA_JABA')),
    prayer_purpose TEXT,
    submission_reference TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (state IN ('DRAFT', 'SUBMITTED', 'IDENTITY_PENDING', 'DUPLICATE_REVIEW', 'VERIFIED', 'ROSTERED', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (verification_status IN ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED', 'REVIEW_REQUIRED')),
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    verified_identity_key TEXT,
    donation_id TEXT,
    anonymous_public INTEGER NOT NULL DEFAULT 1 CHECK (anonymous_public IN (0, 1)),
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    verified_at TEXT,
    completed_at TEXT,
    rejected_at TEXT,
    cancelled_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES jaba_offering_cycles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (participant_id) REFERENCES jaba_participants(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK ((mode = 'MONTHLY_AMAVASYA_JABA' AND cycle_id IS NOT NULL) OR mode = 'DAILY_JABA'),
    CHECK (state <> 'COMPLETED' OR verification_status = 'VERIFIED')
);

CREATE INDEX IF NOT EXISTS idx_jaba_submissions_cycle_state
    ON jaba_submissions (cycle_id, state, verification_status);
CREATE INDEX IF NOT EXISTS idx_jaba_submissions_participant
    ON jaba_submissions (participant_id, mode, state);

CREATE UNIQUE INDEX IF NOT EXISTS ux_jaba_verified_identity_per_cycle
    ON jaba_submissions (cycle_id, verified_identity_key)
    WHERE mode = 'MONTHLY_AMAVASYA_JABA'
      AND verification_status = 'VERIFIED'
      AND verified_identity_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS jaba_identity_verifications (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('OTP', 'MANUAL_REVIEW', 'DOCUMENT', 'OTHER')),
    provider_reference TEXT,
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'VERIFIED', 'FAILED', 'REVOKED')),
    verified_identity_key TEXT,
    checked_at TEXT,
    verified_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES jaba_submissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jaba_duplicate_checks (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    cycle_id TEXT,
    candidate_identity_key TEXT,
    match_basis TEXT NOT NULL,
    outcome TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (outcome IN ('PENDING', 'NO_MATCH', 'MATCH_REVIEW', 'DUPLICATE_CONFIRMED', 'CLEARED')),
    reviewed_by TEXT,
    reviewed_at TEXT,
    review_note_private TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES jaba_submissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (cycle_id) REFERENCES jaba_offering_cycles(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_jaba_duplicate_checks_cycle_outcome
    ON jaba_duplicate_checks (cycle_id, outcome);

CREATE TABLE IF NOT EXISTS jaba_fraud_signals (
    id TEXT PRIMARY KEY,
    submission_id TEXT NOT NULL,
    signal_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    signal_value_opaque TEXT,
    detected_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    resolution TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (submission_id) REFERENCES jaba_submissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS jaba_ritual_roster (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL,
    participant_id TEXT NOT NULL,
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED'
        CHECK (verification_status IN ('VERIFIED', 'REVIEW_REQUIRED', 'REMOVED')),
    ritual_status TEXT NOT NULL DEFAULT 'ROSTERED'
        CHECK (ritual_status IN ('ROSTERED', 'READY', 'PERFORMED', 'COMPLETED', 'CANCELLED')),
    public_visibility TEXT NOT NULL DEFAULT 'AGGREGATE_ONLY'
        CHECK (public_visibility IN ('AGGREGATE_ONLY', 'NAME_WITH_CONSENT', 'PRIVATE')),
    committee_note TEXT,
    completed_at TEXT,
    completed_by TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES jaba_offering_cycles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (participant_id) REFERENCES jaba_participants(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (cycle_id, participant_id),
    UNIQUE (cycle_id, sequence_number)
);

CREATE TABLE IF NOT EXISTS jaba_ritual_allocations (
    id TEXT PRIMARY KEY,
    roster_id TEXT NOT NULL,
    ritual_slot TEXT NOT NULL,
    allocated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    allocated_by TEXT,
    status TEXT NOT NULL DEFAULT 'ALLOCATED'
        CHECK (status IN ('ALLOCATED', 'RELEASED', 'COMPLETED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roster_id) REFERENCES jaba_ritual_roster(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (roster_id, ritual_slot)
);

CREATE TABLE IF NOT EXISTS jaba_ritual_completions (
    id TEXT PRIMARY KEY,
    roster_id TEXT NOT NULL UNIQUE,
    ritual_status TEXT NOT NULL DEFAULT 'PERFORMED'
        CHECK (ritual_status IN ('PERFORMED', 'COMPLETED', 'VOIDED')),
    performed_at TEXT NOT NULL,
    completed_at TEXT,
    completed_by TEXT,
    committee_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (committee_confirmed IN (0, 1)),
    source_id TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (roster_id) REFERENCES jaba_ritual_roster(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS jaba_consent (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL,
    consent_type TEXT NOT NULL CHECK (consent_type IN ('PUBLIC_NAME', 'PUBLIC_PHOTO', 'PUBLIC_STORY', 'DATA_PROCESSING')),
    granted INTEGER NOT NULL CHECK (granted IN (0, 1)),
    consent_text_version TEXT,
    granted_at TEXT,
    revoked_at TEXT,
    source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (participant_id) REFERENCES jaba_participants(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (participant_id, consent_type)
);

CREATE TABLE IF NOT EXISTS jaba_notifications (
    id TEXT PRIMARY KEY,
    cycle_id TEXT,
    submission_id TEXT,
    notification_type TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'PUSH')),
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'SENT', 'FAILED', 'SKIPPED', 'CANCELLED')),
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    provider_reference TEXT,
    sent_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES jaba_offering_cycles(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (submission_id) REFERENCES jaba_submissions(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS jaba_archive (
    id TEXT PRIMARY KEY,
    cycle_id TEXT NOT NULL UNIQUE,
    verified_participant_count INTEGER NOT NULL DEFAULT 0 CHECK (verified_participant_count >= 0),
    ritual_completion_state TEXT NOT NULL,
    committee_confirmed INTEGER NOT NULL DEFAULT 0 CHECK (committee_confirmed IN (0, 1)),
    linked_media_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_media_ids_json)),
    linked_notice_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_notice_ids_json)),
    linked_social_card_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(linked_social_card_ids_json)),
    archive_publication_state TEXT NOT NULL DEFAULT 'NOT_PUBLISHED'
        CHECK (archive_publication_state IN ('NOT_PUBLISHED', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cycle_id) REFERENCES jaba_offering_cycles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_jaba_cycles_state_open
    ON jaba_offering_cycles (state, opens_at, closes_at);
CREATE INDEX IF NOT EXISTS idx_jaba_roster_public
    ON jaba_ritual_roster (cycle_id, verification_status, public_visibility);
CREATE INDEX IF NOT EXISTS idx_jaba_notifications_status
    ON jaba_notifications (status, created_at);

CREATE TRIGGER IF NOT EXISTS trg_jaba_verified_identity_required
BEFORE INSERT ON jaba_submissions
WHEN NEW.mode = 'MONTHLY_AMAVASYA_JABA'
 AND NEW.verification_status = 'VERIFIED'
 AND NEW.verified_identity_key IS NULL
BEGIN
    SELECT RAISE(ABORT, 'verified monthly Jaba submission requires verified_identity_key');
END;

CREATE TRIGGER IF NOT EXISTS trg_jaba_verified_identity_required_update
BEFORE UPDATE OF mode, verification_status, verified_identity_key ON jaba_submissions
WHEN NEW.mode = 'MONTHLY_AMAVASYA_JABA'
 AND NEW.verification_status = 'VERIFIED'
 AND NEW.verified_identity_key IS NULL
BEGIN
    SELECT RAISE(ABORT, 'verified monthly Jaba submission requires verified_identity_key');
END;

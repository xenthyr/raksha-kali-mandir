-- Batch 011 / 015_email.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Contract families: CTR-06996–CTR-07005 + CTR-07033–CTR-07034 (EMAIL)
-- Email is notification transport only. D1 business state remains authoritative.
-- Provider-specific delivery is isolated behind an adapter; this schema stores provider-neutral durable state/events.

PRAGMA foreign_keys = ON;

CREATE TABLE email_destinations (
    id TEXT PRIMARY KEY,
    slot TEXT NOT NULL CHECK (slot IN ('PRIMARY_OPERATIONS','BACKUP_OPERATIONS')),
    address_private TEXT NOT NULL,
    address_normalized TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (slot),
    CHECK (address_normalized = lower(trim(address_normalized)))
);

CREATE INDEX idx_email_destinations_enabled
    ON email_destinations (slot, enabled, verification_status);

CREATE TABLE email_sender_profiles (
    id TEXT PRIMARY KEY,
    provider_code TEXT NOT NULL CHECK (provider_code = 'RESEND'),
    from_address_private TEXT NOT NULL,
    reply_to_address_private TEXT,
    sender_domain TEXT NOT NULL,
    provider_verified INTEGER NOT NULL DEFAULT 0 CHECK (provider_verified IN (0,1)),
    enabled INTEGER NOT NULL DEFAULT 0 CHECK (enabled IN (0,1)),
    environment_scope TEXT NOT NULL CHECK (environment_scope IN ('DEVELOPMENT','PREVIEW','PRODUCTION')),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (lower(sender_domain) <> 'pages.dev' AND lower(sender_domain) NOT LIKE '%.pages.dev'),
    CHECK (enabled = 0 OR (provider_verified = 1 AND verification_status = 'VERIFIED')),
    UNIQUE (environment_scope, from_address_private)
);

CREATE INDEX idx_email_sender_profiles_environment
    ON email_sender_profiles (environment_scope, enabled, provider_verified);

CREATE TABLE email_templates (
    id TEXT PRIMARY KEY,
    template_key TEXT NOT NULL,
    version INTEGER NOT NULL CHECK (version > 0),
    purpose TEXT NOT NULL CHECK (
        purpose IN ('TICKET_ACKNOWLEDGEMENT','STAFF_REPLY','STATUS_CHANGE','ADDITIONAL_INFORMATION','RESOLUTION','SYSTEM')
    ),
    locale TEXT NOT NULL CHECK (locale IN ('bn','en','bn-IN','en-IN')),
    subject_template TEXT NOT NULL,
    body_template_private TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    approved_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    approved_at TEXT,
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (template_key, version, locale),
    CHECK (enabled = 0 OR approved_at IS NOT NULL)
);

CREATE INDEX idx_email_templates_purpose_locale
    ON email_templates (purpose, locale, enabled);

CREATE TABLE email_dispatches (
    id TEXT PRIMARY KEY,
    logical_notification_key_hash TEXT NOT NULL,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    ticket_id TEXT REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    message_id TEXT REFERENCES support_messages(id) ON UPDATE CASCADE ON DELETE SET NULL,
    destination_id TEXT REFERENCES email_destinations(id) ON UPDATE CASCADE ON DELETE SET NULL,
    sender_profile_id TEXT REFERENCES email_sender_profiles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    template_id TEXT REFERENCES email_templates(id) ON UPDATE CASCADE ON DELETE SET NULL,
    template_version INTEGER,
    provider_code TEXT NOT NULL DEFAULT 'RESEND' CHECK (provider_code = 'RESEND'),
    recipient_address_private TEXT NOT NULL,
    recipient_address_normalized TEXT NOT NULL,
    subject_private TEXT NOT NULL,
    body_private TEXT NOT NULL,
    environment_scope TEXT NOT NULL CHECK (environment_scope IN ('DEVELOPMENT','PREVIEW','PRODUCTION')),
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
        status IN ('QUEUED','SENT','DELIVERED','FAILED','BOUNCED','COMPLAINT','OPENED','CLICKED')
    ),
    provider_message_id TEXT,
    provider_last_event_at TEXT,
    queued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    bounced_at TEXT,
    complained_at TEXT,
    opened_at TEXT,
    clicked_at TEXT,
    last_error_code TEXT,
    last_error_detail_private TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    next_attempt_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision_id TEXT,
    UNIQUE (logical_notification_key_hash, recipient_address_normalized),
    CHECK (recipient_address_normalized = lower(trim(recipient_address_normalized))),
    CHECK (status NOT IN ('SENT','DELIVERED','OPENED','CLICKED') OR sent_at IS NOT NULL),
    CHECK (status <> 'DELIVERED' OR delivered_at IS NOT NULL),
    CHECK (status <> 'FAILED' OR failed_at IS NOT NULL),
    CHECK (status <> 'BOUNCED' OR bounced_at IS NOT NULL),
    CHECK (status <> 'COMPLAINT' OR complained_at IS NOT NULL),
    CHECK (status <> 'OPENED' OR opened_at IS NOT NULL),
    CHECK (status <> 'CLICKED' OR clicked_at IS NOT NULL)
);

CREATE INDEX idx_email_dispatch_status_retry
    ON email_dispatches (status, next_attempt_at, queued_at);
CREATE INDEX idx_email_dispatch_provider_message
    ON email_dispatches (provider_message_id);
CREATE INDEX idx_email_dispatch_ticket_message
    ON email_dispatches (ticket_id, message_id, created_at);
CREATE INDEX idx_email_dispatch_recipient
    ON email_dispatches (recipient_address_normalized, created_at);

CREATE TRIGGER trg_email_dispatch_no_development_send
BEFORE UPDATE OF status ON email_dispatches
FOR EACH ROW
WHEN NEW.environment_scope = 'DEVELOPMENT' AND NEW.status NOT IN ('QUEUED','FAILED')
BEGIN
    SELECT RAISE(ABORT, 'development email dispatch cannot enter production-delivery state');
END;

CREATE TABLE email_events (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT REFERENCES email_dispatches(id) ON UPDATE CASCADE ON DELETE SET NULL,
    provider_code TEXT NOT NULL DEFAULT 'RESEND' CHECK (provider_code = 'RESEND'),
    provider_event_id TEXT NOT NULL UNIQUE,
    provider_message_id TEXT,
    event_type TEXT NOT NULL CHECK (
        event_type IN ('QUEUED','SENT','DELIVERED','FAILED','BOUNCED','COMPLAINT','OPENED','CLICKED')
    ),
    event_occurred_at TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    authenticity_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (
        authenticity_status IN ('VERIFIED','REJECTED')
    ),
    signature_scheme TEXT,
    signature_fingerprint_hash TEXT,
    payload_hash TEXT NOT NULL CHECK (length(payload_hash) = 64),
    raw_payload_opaque TEXT,
    error_code TEXT,
    error_detail_private TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (authenticity_status = 'VERIFIED' OR dispatch_id IS NULL)
);

CREATE INDEX idx_email_events_dispatch_time
    ON email_events (dispatch_id, event_occurred_at);
CREATE INDEX idx_email_events_provider_message
    ON email_events (provider_message_id, event_occurred_at);
CREATE INDEX idx_email_events_received
    ON email_events (received_at);

CREATE TRIGGER trg_email_event_authenticity_guard
BEFORE INSERT ON email_events
FOR EACH ROW
WHEN NEW.authenticity_status <> 'VERIFIED'
BEGIN
    SELECT RAISE(ABORT, 'unauthenticated email webhook event cannot be persisted');
END;

CREATE TRIGGER trg_email_event_immutable_update
BEFORE UPDATE ON email_events
BEGIN
    SELECT RAISE(ABORT, 'provider email events are immutable');
END;

CREATE TRIGGER trg_email_event_immutable_delete
BEFORE DELETE ON email_events
BEGIN
    SELECT RAISE(ABORT, 'provider email events are immutable');
END;

CREATE TABLE email_dispatch_attempts (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT NOT NULL REFERENCES email_dispatches(id) ON UPDATE CASCADE ON DELETE CASCADE,
    attempt_number INTEGER NOT NULL CHECK (attempt_number > 0),
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('QUEUED','SENT','FAILED','CANCELLED','SKIPPED_DUPLICATE')),
    provider_request_id TEXT,
    provider_message_id TEXT,
    error_code TEXT,
    error_detail_private TEXT,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (completed_at IS NULL OR completed_at >= started_at),
    UNIQUE (dispatch_id, attempt_number)
);

CREATE INDEX idx_email_attempts_dispatch_time
    ON email_dispatch_attempts (dispatch_id, attempt_number);

CREATE TABLE email_audit_events (
    id TEXT PRIMARY KEY,
    dispatch_id TEXT REFERENCES email_dispatches(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    action TEXT NOT NULL,
    before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
    after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
    reason_code TEXT,
    idempotency_key_hash TEXT UNIQUE,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_email_audit_dispatch_time
    ON email_audit_events (dispatch_id, occurred_at);

CREATE TRIGGER trg_email_destinations_updated_at
AFTER UPDATE ON email_destinations
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE email_destinations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_email_sender_profiles_updated_at
AFTER UPDATE ON email_sender_profiles
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE email_sender_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_email_templates_updated_at
AFTER UPDATE ON email_templates
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE email_templates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_email_dispatches_updated_at
AFTER UPDATE ON email_dispatches
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE email_dispatches SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

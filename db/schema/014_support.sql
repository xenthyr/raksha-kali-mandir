-- Batch 011 / 014_support.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Contract families: CTR-06976–CTR-06995 + CTR-07033–CTR-07034 (SUPPORT)
-- D1 is authoritative. Requester PII and attachments remain private; public tracking is an allow-listed read model.

PRAGMA foreign_keys = ON;

CREATE TABLE support_categories (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE CHECK (code IN ('FINANCE','PUJA','GRIEVANCE','GENERAL')),
    name_bn TEXT NOT NULL,
    name_en TEXT,
    routing_queue_code TEXT NOT NULL CHECK (
        routing_queue_code IN ('FINANCE','PUJA','GOVERNANCE','GENERAL')
    ),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE support_tickets (
    id TEXT PRIMARY KEY,
    public_reference TEXT NOT NULL UNIQUE CHECK (
        public_reference GLOB 'MRK-[0-9][0-9][0-9][0-9]-[0-9][0-9][0-9][0-9][0-9][0-9]'
    ),
    requester_name TEXT NOT NULL,
    requester_email_private TEXT NOT NULL,
    category_id TEXT NOT NULL REFERENCES support_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    category_code TEXT NOT NULL CHECK (category_code IN ('FINANCE','PUJA','GRIEVANCE','GENERAL')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    tracking_pin_hash TEXT NOT NULL,
    tracking_pin_kdf_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','REJECTED','CLOSED')
    ),
    priority TEXT NOT NULL DEFAULT 'NORMAL' CHECK (priority IN ('LOW','NORMAL','HIGH','URGENT')),
    noindex_required INTEGER NOT NULL DEFAULT 1 CHECK (noindex_required IN (0,1)),
    turnstile_verified INTEGER NOT NULL DEFAULT 0 CHECK (turnstile_verified IN (0,1)),
    turnstile_verification_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    first_response_at TEXT,
    resolved_at TEXT,
    closed_at TEXT,
    revision_id TEXT,
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    CHECK (resolved_at IS NULL OR resolved_at >= created_at),
    CHECK (closed_at IS NULL OR closed_at >= created_at),
    CHECK (status IN ('RESOLVED','CLOSED') OR resolved_at IS NULL),
    CHECK (status <> 'CLOSED' OR closed_at IS NOT NULL)
);

CREATE INDEX idx_support_tickets_status_category
    ON support_tickets (status, category_id, priority);
CREATE INDEX idx_support_tickets_reference
    ON support_tickets (public_reference);
CREATE INDEX idx_support_tickets_email_private
    ON support_tickets (requester_email_private);
CREATE INDEX idx_support_tickets_created
    ON support_tickets (created_at);

CREATE TABLE support_idempotency_records (
    id TEXT PRIMARY KEY,
    operation_type TEXT NOT NULL,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    request_hash TEXT NOT NULL,
    ticket_id TEXT REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    response_status_code INTEGER,
    response_body_opaque TEXT,
    state TEXT NOT NULL DEFAULT 'RESERVED' CHECK (
        state IN ('RESERVED','COMPLETED','FAILED','CONFLICT')
    ),
    expires_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_idempotency_operation
    ON support_idempotency_records (operation_type, state, created_at);

CREATE TABLE support_messages (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    author_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    author_type TEXT NOT NULL CHECK (author_type IN ('REQUESTER','STAFF','SYSTEM')),
    visibility TEXT NOT NULL CHECK (visibility IN ('PUBLIC_REPLY','INTERNAL_NOTE')),
    body_private TEXT NOT NULL,
    idempotency_key_hash TEXT UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision_id TEXT,
    CHECK ((author_type = 'REQUESTER' AND visibility = 'PUBLIC_REPLY') OR author_type IN ('STAFF','SYSTEM')),
    CHECK (visibility <> 'INTERNAL_NOTE' OR author_type IN ('STAFF','SYSTEM'))
);

CREATE INDEX idx_support_messages_ticket_created
    ON support_messages (ticket_id, created_at);
CREATE INDEX idx_support_messages_visibility
    ON support_messages (ticket_id, visibility, created_at);

CREATE TABLE support_attachments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    message_id TEXT REFERENCES support_messages(id) ON UPDATE CASCADE ON DELETE SET NULL,
    file_name TEXT NOT NULL,
    declared_mime TEXT NOT NULL CHECK (lower(declared_mime) IN ('image/jpeg','image/png','image/webp','application/pdf')),
    detected_mime TEXT,
    file_size_bytes INTEGER NOT NULL CHECK (file_size_bytes >= 0 AND file_size_bytes <= 5242880),
    checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
    storage_provider TEXT NOT NULL DEFAULT 'BACKBLAZE_B2' CHECK (storage_provider = 'BACKBLAZE_B2'),
    storage_object_key_private TEXT NOT NULL,
    storage_visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (storage_visibility = 'PRIVATE'),
    upload_state TEXT NOT NULL DEFAULT 'REGISTERED' CHECK (
        upload_state IN ('REGISTERED','UPLOADING','UPLOADED','SCANNING','CLEAN','FAILED','QUARANTINED','DELETED')
    ),
    malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        malware_scan_status IN ('PENDING','CLEAN','INFECTED','FAILED','NOT_SUPPORTED')
    ),
    file_type_verified INTEGER NOT NULL DEFAULT 0 CHECK (file_type_verified IN (0,1)),
    integrity_verified INTEGER NOT NULL DEFAULT 0 CHECK (integrity_verified IN (0,1)),
    finalized_at TEXT,
    failure_code TEXT,
    failure_detail_private TEXT,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    public_indexed INTEGER NOT NULL DEFAULT 0 CHECK (public_indexed = 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision_id TEXT,
    CHECK (upload_state <> 'CLEAN' OR (malware_scan_status = 'CLEAN' AND file_type_verified = 1 AND integrity_verified = 1)),
    CHECK (finalized_at IS NULL OR finalized_at >= created_at)
);

CREATE INDEX idx_support_attachments_ticket_state
    ON support_attachments (ticket_id, upload_state, malware_scan_status);
CREATE INDEX idx_support_attachments_checksum
    ON support_attachments (checksum_sha256);
CREATE INDEX idx_support_attachments_message
    ON support_attachments (message_id);

CREATE TRIGGER trg_support_attachment_no_public
BEFORE UPDATE OF public_indexed ON support_attachments
FOR EACH ROW
WHEN NEW.public_indexed <> 0
BEGIN
    SELECT RAISE(ABORT, 'support attachments cannot be public-indexed');
END;

CREATE TRIGGER trg_support_attachment_b2_only
BEFORE INSERT ON support_attachments
FOR EACH ROW
WHEN NEW.storage_provider <> 'BACKBLAZE_B2' OR NEW.storage_visibility <> 'PRIVATE'
BEGIN
    SELECT RAISE(ABORT, 'support attachments must use private Backblaze B2 storage');
END;

CREATE TABLE support_assignments (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    queue_code TEXT NOT NULL CHECK (queue_code IN ('FINANCE','PUJA','GOVERNANCE','GENERAL')),
    assigned_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    assigned_role_id TEXT REFERENCES committee_roles(id) ON UPDATE CASCADE ON DELETE SET NULL,
    assigned_by_user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','RELEASED','CLOSED')),
    assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    released_at TEXT,
    reason_code TEXT,
    revision_id TEXT,
    CHECK (released_at IS NULL OR released_at >= assigned_at)
);

CREATE UNIQUE INDEX ux_support_active_assignment
    ON support_assignments (ticket_id)
    WHERE status = 'ACTIVE';
CREATE INDEX idx_support_assignments_queue
    ON support_assignments (queue_code, status, assigned_user_id, assigned_role_id);

CREATE TABLE support_status_history (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_status TEXT CHECK (from_status IN ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','REJECTED','CLOSED')),
    to_status TEXT NOT NULL CHECK (to_status IN ('OPEN','IN_PROGRESS','WAITING_USER','RESOLVED','REJECTED','CLOSED')),
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_role TEXT,
    reason_code TEXT NOT NULL,
    note_private TEXT,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key_hash TEXT UNIQUE,
    revision_id TEXT
);

CREATE INDEX idx_support_status_history_ticket_time
    ON support_status_history (ticket_id, occurred_at);

CREATE TRIGGER trg_support_status_history_immutable_update
BEFORE UPDATE ON support_status_history
BEGIN
    SELECT RAISE(ABORT, 'support status history is immutable');
END;

CREATE TRIGGER trg_support_status_history_immutable_delete
BEFORE DELETE ON support_status_history
BEGIN
    SELECT RAISE(ABORT, 'support status history is immutable');
END;

CREATE TABLE support_internal_notes (
    id TEXT PRIMARY KEY,
    ticket_id TEXT NOT NULL REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    author_user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    note_private TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision_id TEXT
);

CREATE INDEX idx_support_internal_notes_ticket_time
    ON support_internal_notes (ticket_id, created_at);

CREATE TABLE support_tracking_attempts (
    id TEXT PRIMARY KEY,
    ticket_id TEXT REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    attempted_reference TEXT,
    client_fingerprint_hash TEXT,
    ip_hash TEXT,
    outcome TEXT NOT NULL CHECK (outcome IN ('SUCCESS','INVALID_REFERENCE','INVALID_PIN','RATE_LIMITED','DENIED')),
    attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    retry_after_seconds INTEGER CHECK (retry_after_seconds IS NULL OR retry_after_seconds >= 0),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_support_tracking_attempts_reference_time
    ON support_tracking_attempts (attempted_reference, attempted_at);
CREATE INDEX idx_support_tracking_attempts_client_time
    ON support_tracking_attempts (client_fingerprint_hash, attempted_at);
CREATE INDEX idx_support_tracking_attempts_ip_time
    ON support_tracking_attempts (ip_hash, attempted_at);

CREATE TABLE support_audit_events (
    id TEXT PRIMARY KEY,
    ticket_id TEXT REFERENCES support_tickets(id) ON UPDATE CASCADE ON DELETE SET NULL,
    message_id TEXT REFERENCES support_messages(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_role TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    before_json TEXT CHECK (before_json IS NULL OR json_valid(before_json)),
    after_json TEXT CHECK (after_json IS NULL OR json_valid(after_json)),
    reason_code TEXT,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    idempotency_key_hash TEXT UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_support_audit_ticket_time
    ON support_audit_events (ticket_id, occurred_at);
CREATE INDEX idx_support_audit_entity_time
    ON support_audit_events (entity_type, entity_id, occurred_at);

CREATE TRIGGER trg_support_tickets_updated_at
AFTER UPDATE ON support_tickets
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE support_tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_support_idempotency_updated_at
AFTER UPDATE ON support_idempotency_records
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE support_idempotency_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_support_messages_updated_at
AFTER UPDATE ON support_messages
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE support_messages SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_support_attachments_updated_at
AFTER UPDATE ON support_attachments
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE support_attachments SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_support_categories_updated_at
AFTER UPDATE ON support_categories
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE support_categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_support_ticket_category_guard_insert
BEFORE INSERT ON support_tickets
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM support_categories c WHERE c.id = NEW.category_id AND c.code = NEW.category_code)
BEGIN
    SELECT RAISE(ABORT, 'support ticket category_id/category_code mismatch');
END;

CREATE TRIGGER trg_support_ticket_category_guard_update
BEFORE UPDATE OF category_id, category_code ON support_tickets
FOR EACH ROW
WHEN NOT EXISTS (SELECT 1 FROM support_categories c WHERE c.id = NEW.category_id AND c.code = NEW.category_code)
BEGIN
    SELECT RAISE(ABORT, 'support ticket category_id/category_code mismatch');
END;

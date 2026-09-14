-- Batch 012 / 016_storage_policy.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Contract families: CTR-05101–CTR-05200 (DATABASE), CTR-05201–CTR-05300 (STORAGE),
-- CTR-06401–CTR-06500 (MIGRATION), CTR-05701–CTR-05800 (DATAQUALITY),
-- CTR-06951–CTR-06960 (V1.1.3 storage extension).
-- Backblaze B2 is the sole production object-storage provider. Objects remain private.

PRAGMA foreign_keys = ON;

CREATE TABLE storage_objects (
    id TEXT PRIMARY KEY,
    object_class TEXT NOT NULL CHECK (
        object_class IN (
            'MEDIA_ORIGINAL','MEDIA_PROCESSED','MEDIA_THUMBNAIL','MEDIA_OG','MEDIA_POSTER',
            'DOCUMENT_PRIVATE','DOCUMENT_PUBLIC','SUPPORT_ATTACHMENT_PRIVATE',
            'BACKUP_PRIVATE','OTHER_PRIVATE'
        )
    ),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'B2' CHECK (provider = 'B2'),
    bucket_name TEXT NOT NULL,
    object_key TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility = 'PRIVATE'),
    serving_mode TEXT NOT NULL DEFAULT 'AUTHORIZED_PROXY'
        CHECK (serving_mode IN ('AUTHORIZED_PROXY','SIGNED_URL')),
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    checksum_sha256 TEXT CHECK (checksum_sha256 IS NULL OR length(checksum_sha256) = 64),
    etag TEXT,
    content_disposition TEXT NOT NULL DEFAULT 'INLINE'
        CHECK (content_disposition IN ('INLINE','ATTACHMENT')),
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    lifecycle_state TEXT NOT NULL DEFAULT 'PENDING_UPLOAD'
        CHECK (lifecycle_state IN (
            'PENDING_UPLOAD','UPLOADING','UPLOADED','VERIFIED','QUARANTINED',
            'AVAILABLE','ARCHIVED','DELETE_PENDING','DELETED','RECONCILIATION_REQUIRED','FAILED'
        )),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE SET NULL,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    UNIQUE (bucket_name, object_key),
    UNIQUE (id, version),
    CHECK (bucket_name <> ''),
    CHECK (object_key <> '' AND object_key NOT LIKE '/%' AND object_key NOT LIKE '%..%'),
    CHECK (lifecycle_state = 'DELETED' OR deleted_at IS NULL),
    CHECK (lifecycle_state <> 'AVAILABLE' OR checksum_sha256 IS NOT NULL),
    CHECK (provider <> 'R2')
);

CREATE INDEX idx_storage_objects_entity_state
    ON storage_objects (entity_type, entity_id, lifecycle_state);
CREATE INDEX idx_storage_objects_class_state
    ON storage_objects (object_class, lifecycle_state, updated_at);
CREATE INDEX idx_storage_objects_checksum
    ON storage_objects (checksum_sha256);
CREATE INDEX idx_storage_objects_reconciliation
    ON storage_objects (lifecycle_state, provider, updated_at);
CREATE INDEX idx_storage_objects_source
    ON storage_objects (source_id);

CREATE TABLE storage_upload_intents (
    id TEXT PRIMARY KEY,
    storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    upload_token_hash TEXT,
    expected_byte_size INTEGER CHECK (expected_byte_size IS NULL OR expected_byte_size >= 0),
    expected_checksum_sha256 TEXT CHECK (expected_checksum_sha256 IS NULL OR length(expected_checksum_sha256) = 64),
    expected_mime_type TEXT,
    expires_at TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'ISSUED'
        CHECK (state IN ('ISSUED','USED','EXPIRED','REVOKED','CONFLICT')),
    issued_to_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    used_at TEXT,
    CHECK (expires_at >= created_at),
    CHECK (state <> 'USED' OR used_at IS NOT NULL)
);

CREATE INDEX idx_storage_upload_intents_object_state
    ON storage_upload_intents (storage_object_id, state, expires_at);
CREATE INDEX idx_storage_upload_intents_expiry
    ON storage_upload_intents (state, expires_at);

CREATE TABLE storage_access_grants (
    id TEXT PRIMARY KEY,
    storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON UPDATE CASCADE ON DELETE CASCADE,
    principal_type TEXT NOT NULL CHECK (principal_type IN ('ADMIN_USER','SYSTEM','AUTHENTICATED_USER')),
    principal_id TEXT,
    purpose TEXT NOT NULL CHECK (
        purpose IN ('UPLOAD','DOWNLOAD','DELETE','RECONCILE','PREVIEW','PROCESS')
    ),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    max_uses INTEGER NOT NULL DEFAULT 1 CHECK (max_uses > 0),
    used_count INTEGER NOT NULL DEFAULT 0 CHECK (used_count >= 0),
    state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (state IN ('ACTIVE','EXPIRED','REVOKED','EXHAUSTED')),
    issued_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    idempotency_key_hash TEXT UNIQUE,
    CHECK (principal_type = 'SYSTEM' OR principal_id IS NOT NULL),
    CHECK (used_count <= max_uses),
    CHECK (state <> 'EXHAUSTED' OR used_count >= max_uses)
);

CREATE INDEX idx_storage_access_grants_object
    ON storage_access_grants (storage_object_id, purpose, state, expires_at);
CREATE INDEX idx_storage_access_grants_principal
    ON storage_access_grants (principal_type, principal_id, state, expires_at);

CREATE TABLE storage_lifecycle_events (
    id TEXT PRIMARY KEY,
    storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_state TEXT,
    to_state TEXT NOT NULL CHECK (to_state IN (
        'PENDING_UPLOAD','UPLOADING','UPLOADED','VERIFIED','QUARANTINED',
        'AVAILABLE','ARCHIVED','DELETE_PENDING','DELETED','RECONCILIATION_REQUIRED','FAILED'
    )),
    reason_code TEXT NOT NULL,
    actor_type TEXT NOT NULL CHECK (actor_type IN ('USER','WORKER','SYSTEM')),
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    occurred_at TEXT NOT NULL,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_storage_lifecycle_events_object_time
    ON storage_lifecycle_events (storage_object_id, occurred_at);
CREATE INDEX idx_storage_lifecycle_events_idempotency
    ON storage_lifecycle_events (idempotency_key_hash);

CREATE TABLE storage_reconciliation_runs (
    id TEXT PRIMARY KEY,
    run_reference TEXT NOT NULL UNIQUE,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    mode TEXT NOT NULL CHECK (mode IN ('FULL','INCREMENTAL','OBJECT','DATABASE')),
    state TEXT NOT NULL DEFAULT 'RUNNING'
        CHECK (state IN ('RUNNING','COMPLETED','FAILED','PARTIAL','CANCELLED')),
    scanned_count INTEGER NOT NULL DEFAULT 0 CHECK (scanned_count >= 0),
    matched_count INTEGER NOT NULL DEFAULT 0 CHECK (matched_count >= 0),
    orphan_count INTEGER NOT NULL DEFAULT 0 CHECK (orphan_count >= 0),
    missing_count INTEGER NOT NULL DEFAULT 0 CHECK (missing_count >= 0),
    checksum_mismatch_count INTEGER NOT NULL DEFAULT 0 CHECK (checksum_mismatch_count >= 0),
    error_count INTEGER NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    initiated_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    summary_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(summary_json)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE INDEX idx_storage_reconciliation_runs_state
    ON storage_reconciliation_runs (state, started_at);

CREATE TABLE storage_reconciliation_items (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES storage_reconciliation_runs(id) ON UPDATE CASCADE ON DELETE CASCADE,
    storage_object_id TEXT REFERENCES storage_objects(id) ON UPDATE CASCADE ON DELETE SET NULL,
    object_key TEXT,
    finding_type TEXT NOT NULL CHECK (
        finding_type IN ('MATCH','ORPHAN_OBJECT','MISSING_OBJECT','CHECKSUM_MISMATCH','STALE_RECORD','UNEXPECTED_PROVIDER','INVALID_KEY')
    ),
    expected_checksum_sha256 TEXT CHECK (expected_checksum_sha256 IS NULL OR length(expected_checksum_sha256) = 64),
    observed_checksum_sha256 TEXT CHECK (observed_checksum_sha256 IS NULL OR length(observed_checksum_sha256) = 64),
    resolution_state TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (resolution_state IN ('OPEN','IGNORED','QUARANTINED','DELETE_PENDING','RESOLVED')),
    resolution_note_private TEXT,
    resolved_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    resolved_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (run_id, object_key, finding_type)
);

CREATE INDEX idx_storage_reconciliation_items_run_finding
    ON storage_reconciliation_items (run_id, finding_type, resolution_state);
CREATE INDEX idx_storage_reconciliation_items_object
    ON storage_reconciliation_items (storage_object_id, resolution_state);

CREATE TABLE storage_delete_requests (
    id TEXT PRIMARY KEY,
    storage_object_id TEXT NOT NULL REFERENCES storage_objects(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    requested_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    reason_code TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (state IN ('PENDING','APPROVED','EXECUTING','COMPLETED','REJECTED','FAILED','CANCELLED')),
    approval_id TEXT,
    idempotency_key_hash TEXT NOT NULL UNIQUE,
    requested_at TEXT NOT NULL,
    approved_at TEXT,
    completed_at TEXT,
    failure_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (state <> 'APPROVED' OR approved_at IS NOT NULL),
    CHECK (state <> 'COMPLETED' OR completed_at IS NOT NULL)
);

CREATE INDEX idx_storage_delete_requests_state
    ON storage_delete_requests (state, requested_at);
CREATE INDEX idx_storage_delete_requests_object
    ON storage_delete_requests (storage_object_id, state);

CREATE TRIGGER trg_storage_objects_updated_at
AFTER UPDATE ON storage_objects
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE storage_objects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_storage_upload_intents_updated_at
AFTER UPDATE ON storage_upload_intents
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE storage_upload_intents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_storage_reconciliation_runs_updated_at
AFTER UPDATE ON storage_reconciliation_runs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE storage_reconciliation_runs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_storage_reconciliation_items_updated_at
AFTER UPDATE ON storage_reconciliation_items
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE storage_reconciliation_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_storage_provider_guard_insert
BEFORE INSERT ON storage_objects
FOR EACH ROW
WHEN NEW.provider <> 'B2'
BEGIN
    SELECT RAISE(ABORT, 'only Backblaze B2 is permitted for production storage');
END;

CREATE TRIGGER trg_storage_provider_guard_update
BEFORE UPDATE OF provider ON storage_objects
FOR EACH ROW
WHEN NEW.provider <> 'B2'
BEGIN
    SELECT RAISE(ABORT, 'only Backblaze B2 is permitted for production storage');
END;

CREATE TRIGGER trg_storage_visibility_guard_insert
BEFORE INSERT ON storage_objects
FOR EACH ROW
WHEN NEW.visibility <> 'PRIVATE'
BEGIN
    SELECT RAISE(ABORT, 'storage objects must remain private');
END;

CREATE TRIGGER trg_storage_visibility_guard_update
BEFORE UPDATE OF visibility ON storage_objects
FOR EACH ROW
WHEN NEW.visibility <> 'PRIVATE'
BEGIN
    SELECT RAISE(ABORT, 'storage objects must remain private');
END;

CREATE TRIGGER trg_storage_availability_guard
BEFORE UPDATE OF lifecycle_state, checksum_sha256 ON storage_objects
FOR EACH ROW
WHEN NEW.lifecycle_state = 'AVAILABLE' AND NEW.checksum_sha256 IS NULL
BEGIN
    SELECT RAISE(ABORT, 'available object requires recorded checksum');
END;

CREATE TRIGGER trg_storage_public_class_guard
BEFORE INSERT ON storage_objects
FOR EACH ROW
WHEN NEW.object_class = 'DOCUMENT_PUBLIC'
 AND NEW.visibility <> 'PRIVATE'
BEGIN
    SELECT RAISE(ABORT, 'document public class still uses private B2 storage');
END;

CREATE TRIGGER trg_storage_delete_authorization_guard
BEFORE UPDATE OF state ON storage_delete_requests
FOR EACH ROW
WHEN NEW.state IN ('APPROVED','EXECUTING','COMPLETED')
 AND NEW.approved_at IS NULL
BEGIN
    SELECT RAISE(ABORT, 'delete authorization is required before execution');
END;

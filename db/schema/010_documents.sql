-- Batch 010 / 010_documents.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Contract families: CTR-05101–CTR-05200 (DATABASE), CTR-06401–CTR-06500 (MIGRATION), CTR-05701–CTR-05800 (DATAQUALITY)
-- Document lifecycle is intentionally separate from approval/publication. Upload never implies publication.

PRAGMA foreign_keys = ON;

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    title_bn TEXT,
    title_en TEXT,
    document_type TEXT NOT NULL CHECK (
        document_type IN (
            'PDF','WORD','EXCEL','SCANNED_DOCUMENT','LETTER','REGISTER',
            'RECEIPT','RESOLUTION','MINUTES','NOTICE','NEWSPAPER','IMAGE','TXT','OTHER'
        )
    ),
    category TEXT,
    document_date TEXT,
    approximate_date TEXT,
    issuer TEXT,
    authority TEXT,
    uploader_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    upload_role TEXT,
    uploaded_at TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        state IN (
            'UPLOADED','SCANNING','SCAN_FAILED','VALIDATING','VALIDATION_FAILED',
            'REGISTERED','EXTRACTING','EXTRACTED','CLASSIFIED','DRAFT','REVIEW',
            'APPROVED','PUBLISHED','ARCHIVED','REJECTED','QUARANTINED'
        )
    ),
    public_private TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (
        public_private IN ('PRIVATE','INTERNAL','PUBLIC_PENDING','PUBLIC')
    ),
    access_policy TEXT NOT NULL DEFAULT 'ADMIN_ONLY' CHECK (
        access_policy IN ('ADMIN_ONLY','INTERNAL_STAFF','APPROVED_PUBLIC','CUSTOM')
    ),
    language TEXT,
    ocr_required INTEGER NOT NULL DEFAULT 0 CHECK (ocr_required IN (0,1)),
    extracted_text TEXT,
    extracted_tables_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(extracted_tables_json)),
    translation_bn TEXT,
    translation_en TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    retention_policy TEXT,
    retention_until TEXT,
    supersedes_document_id TEXT REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL,
    superseded_by_document_id TEXT REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL,
    current_version_no INTEGER NOT NULL DEFAULT 1 CHECK (current_version_no > 0),
    revision_id TEXT,
    source_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    CHECK (approximate_date IS NULL OR approximate_date <> ''),
    CHECK (state <> 'PUBLISHED' OR (public_private = 'PUBLIC' AND verification_status = 'VERIFIED')),
    CHECK (public_private <> 'PUBLIC' OR state IN ('APPROVED','PUBLISHED','ARCHIVED')),
    CHECK (public_private <> 'PUBLIC' OR access_policy = 'APPROVED_PUBLIC'),
    CHECK (retention_until IS NULL OR retention_until >= created_at),
    UNIQUE (id, current_version_no)
);

CREATE INDEX idx_documents_state_visibility
    ON documents (state, public_private, verification_status);
CREATE INDEX idx_documents_type_date
    ON documents (document_type, document_date);
CREATE INDEX idx_documents_uploader
    ON documents (uploader_user_id, uploaded_at);
CREATE INDEX idx_documents_supersession
    ON documents (supersedes_document_id, superseded_by_document_id);
CREATE INDEX idx_documents_source
    ON documents (source_id);
CREATE INDEX idx_documents_updated
    ON documents (updated_at);

CREATE TABLE document_versions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    version_no INTEGER NOT NULL CHECK (version_no > 0),
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size >= 0),
    checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
    storage_object_key_private TEXT,
    storage_provider TEXT,
    upload_state TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (
        upload_state IN ('UPLOADED','SCANNING','CLEAN','INFECTED','INVALID','QUARANTINED','DELETED')
    ),
    file_type_verified INTEGER NOT NULL DEFAULT 0 CHECK (file_type_verified IN (0,1)),
    integrity_verified INTEGER NOT NULL DEFAULT 0 CHECK (integrity_verified IN (0,1)),
    malware_scan_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        malware_scan_status IN ('PENDING','CLEAN','INFECTED','FAILED','NOT_SUPPORTED')
    ),
    extraction_status TEXT NOT NULL DEFAULT 'NOT_STARTED' CHECK (
        extraction_status IN ('NOT_STARTED','QUEUED','RUNNING','SUCCEEDED','FAILED','NOT_REQUIRED')
    ),
    extraction_provider TEXT,
    extracted_at TEXT,
    quarantined_at TEXT,
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (document_id, version_no),
    UNIQUE (checksum_sha256),
    CHECK (file_size <= 52428800),
    CHECK (storage_provider IS NULL OR storage_provider <> 'R2')
);

CREATE INDEX idx_document_versions_document
    ON document_versions (document_id, version_no DESC);
CREATE INDEX idx_document_versions_scan_state
    ON document_versions (upload_state, malware_scan_status, integrity_verified, file_type_verified);
CREATE INDEX idx_document_versions_checksum
    ON document_versions (checksum_sha256);

CREATE TABLE document_reviews (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    version_id TEXT REFERENCES document_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    review_stage TEXT NOT NULL CHECK (
        review_stage IN ('SECURITY','METADATA','CONTENT','CLASSIFICATION','PUBLICATION')
    ),
    decision TEXT NOT NULL CHECK (
        decision IN ('PENDING','APPROVED','REJECTED','CHANGES_REQUESTED','OVERRIDDEN')
    ),
    reviewer_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    review_note_private TEXT,
    reviewed_at TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (document_id, version_id, review_stage),
    CHECK (decision = 'PENDING' OR reviewed_at IS NOT NULL)
);

CREATE INDEX idx_document_reviews_document_stage
    ON document_reviews (document_id, review_stage, decision);
CREATE INDEX idx_document_reviews_reviewer
    ON document_reviews (reviewer_user_id, reviewed_at);

CREATE TABLE document_state_events (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_state TEXT,
    to_state TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_role TEXT,
    occurred_at TEXT NOT NULL,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_document_state_events_document_time
    ON document_state_events (document_id, occurred_at);
CREATE INDEX idx_document_state_events_idempotency
    ON document_state_events (idempotency_key_hash);

CREATE TABLE document_extractions (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE,
    version_id TEXT NOT NULL REFERENCES document_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    extraction_type TEXT NOT NULL CHECK (
        extraction_type IN ('TEXT','TABLE','OCR','TRANSLATION','THUMBNAIL','PREVIEW')
    ),
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
        status IN ('QUEUED','RUNNING','SUCCEEDED','FAILED','REJECTED')
    ),
    output_text TEXT,
    output_json TEXT CHECK (output_json IS NULL OR json_valid(output_json)),
    provider TEXT,
    provider_reference TEXT,
    error_code TEXT,
    completed_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (version_id, extraction_type)
);

CREATE INDEX idx_document_extractions_document
    ON document_extractions (document_id, status, extraction_type);

CREATE TRIGGER trg_documents_updated_at
AFTER UPDATE ON documents
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_document_versions_updated_at
AFTER UPDATE ON document_versions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE document_versions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_document_reviews_updated_at
AFTER UPDATE ON document_reviews
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE document_reviews SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_document_extractions_updated_at
AFTER UPDATE ON document_extractions
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE document_extractions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_documents_publish_guard
BEFORE UPDATE OF state, public_private, verification_status, access_policy ON documents
FOR EACH ROW
WHEN NEW.state = 'PUBLISHED'
 AND (NEW.public_private <> 'PUBLIC' OR NEW.verification_status <> 'VERIFIED' OR NEW.access_policy <> 'APPROVED_PUBLIC')
BEGIN
    SELECT RAISE(ABORT, 'published document must be public, verified, and approved for public access');
END;

CREATE TRIGGER trg_document_versions_private_object_guard
BEFORE INSERT ON document_versions
FOR EACH ROW
WHEN NEW.upload_state IN ('CLEAN','DELETED') AND NEW.storage_provider = 'R2'
BEGIN
    SELECT RAISE(ABORT, 'R2 storage provider is retired');
END;

-- Batch 010 / 011_source_evidence.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Source/evidence and provenance are first-class audit data. Historical evidence is retained; it does not silently become current truth.

PRAGMA foreign_keys = ON;

CREATE TABLE sources (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (
        source_type IN ('CANONICAL_SOURCE_DATA','PANJIKA','BLUEPRINT','DOCUMENT','OFFICIAL_SITE','OFFICIAL_API','COMMITTEE_RECORD','OTHER')
    ),
    title_bn TEXT,
    title_en TEXT,
    authority TEXT,
    publisher TEXT,
    locator TEXT,
    locator_hash TEXT,
    source_version TEXT,
    issued_at TEXT,
    retrieved_at TEXT,
    checksum_sha256 TEXT CHECK (checksum_sha256 IS NULL OR length(checksum_sha256) = 64),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    evidence_class TEXT NOT NULL DEFAULT 'SECONDARY' CHECK (
        evidence_class IN ('PRIMARY','OFFICIAL','SECONDARY','COMMUNITY_RECORD','USER_SUBMITTED','DERIVED')
    ),
    access_scope TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (
        access_scope IN ('PUBLIC','INTERNAL','PRIVATE_ADMIN')
    ),
    historical_only INTEGER NOT NULL DEFAULT 0 CHECK (historical_only IN (0,1)),
    current_truth_eligible INTEGER NOT NULL DEFAULT 0 CHECK (current_truth_eligible IN (0,1)),
    raw_reference_opaque TEXT,
    notes_private TEXT,
    revision_id TEXT,
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (current_truth_eligible = 0 OR verification_status = 'VERIFIED'),
    CHECK (historical_only = 0 OR current_truth_eligible = 0),
    CHECK (access_scope <> 'PRIVATE_ADMIN' OR current_truth_eligible = 0)
);

CREATE INDEX idx_sources_type_status
    ON sources (source_type, verification_status, current_truth_eligible);
CREATE INDEX idx_sources_version_authority
    ON sources (source_version, authority);
CREATE INDEX idx_sources_checksum
    ON sources (checksum_sha256);
CREATE INDEX idx_sources_updated
    ON sources (updated_at);

CREATE TABLE source_evidence (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    document_id TEXT REFERENCES documents(id) ON UPDATE CASCADE ON DELETE SET NULL,
    evidence_type TEXT NOT NULL CHECK (
        evidence_type IN ('DOCUMENT','EXCERPT','TABLE_ROW','FIELD','PHOTO','SCAN','URL','OBSERVATION','CALCULATION_INPUT','OTHER')
    ),
    locator TEXT,
    excerpt_text TEXT,
    structured_value_json TEXT CHECK (structured_value_json IS NULL OR json_valid(structured_value_json)),
    content_hash TEXT,
    observed_at TEXT,
    verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (
        verification_status IN ('PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    verification_method TEXT,
    verified_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    verified_at TEXT,
    confidence TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
        confidence IN ('LOW','MEDIUM','HIGH','VERY_HIGH')
    ),
    historical_context_bn TEXT,
    historical_context_en TEXT,
    correction_required INTEGER NOT NULL DEFAULT 0 CHECK (correction_required IN (0,1)),
    correction_note_private TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (verification_status = 'PENDING' OR verified_at IS NOT NULL)
);

CREATE INDEX idx_source_evidence_source_status
    ON source_evidence (source_id, verification_status, confidence);
CREATE INDEX idx_source_evidence_document
    ON source_evidence (document_id, verification_status);
CREATE INDEX idx_source_evidence_content_hash
    ON source_evidence (content_hash);

CREATE TABLE provenance_records (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    source_id TEXT NOT NULL REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    evidence_id TEXT REFERENCES source_evidence(id) ON UPDATE CASCADE ON DELETE SET NULL,
    relation_type TEXT NOT NULL CHECK (
        relation_type IN ('DIRECT_SOURCE','SUPPORTED_BY','DERIVED_FROM','CORRECTS','SUPERSEDES','HISTORICAL_CONTEXT','VERIFICATION')
    ),
    source_field TEXT,
    evidence_locator TEXT,
    observed_value_hash TEXT,
    claim_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        claim_status IN ('UNVERIFIED','SUPPORTED','CONFLICTED','REJECTED','SUPERSEDED')
    ),
    verified_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    verified_at TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (claim_status IN ('UNVERIFIED','CONFLICTED','REJECTED') OR verified_at IS NOT NULL)
);

CREATE INDEX idx_provenance_entity
    ON provenance_records (entity_type, entity_id, relation_type);
CREATE INDEX idx_provenance_source
    ON provenance_records (source_id, claim_status);
CREATE INDEX idx_provenance_evidence
    ON provenance_records (evidence_id);

CREATE TABLE source_verification_events (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (
        to_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    verification_method TEXT NOT NULL,
    verification_note_private TEXT,
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    occurred_at TEXT NOT NULL,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE
);

CREATE INDEX idx_source_verification_events_source_time
    ON source_verification_events (source_id, occurred_at);

CREATE TABLE source_snapshots (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    snapshot_label TEXT NOT NULL,
    captured_at TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL CHECK (length(checksum_sha256) = 64),
    content_metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(content_metadata_json)),
    snapshot_object_opaque TEXT,
    access_scope TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (
        access_scope IN ('PUBLIC','INTERNAL','PRIVATE_ADMIN')
    ),
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL,
    UNIQUE (source_id, snapshot_label),
    UNIQUE (checksum_sha256)
);

CREATE INDEX idx_source_snapshots_source_time
    ON source_snapshots (source_id, captured_at);

CREATE TABLE document_source_links (
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE CASCADE,
    source_id TEXT NOT NULL REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    relationship TEXT NOT NULL CHECK (
        relationship IN ('ORIGIN','REFERENCE','SUPPORTING_EVIDENCE','CORRECTION_SOURCE','HISTORICAL_SOURCE')
    ),
    primary_source INTEGER NOT NULL DEFAULT 0 CHECK (primary_source IN (0,1)),
    created_at TEXT NOT NULL,
    PRIMARY KEY (document_id, source_id, relationship)
);

CREATE UNIQUE INDEX ux_document_primary_source
    ON document_source_links (document_id)
    WHERE primary_source = 1;

CREATE INDEX idx_document_source_links_source
    ON document_source_links (source_id, relationship);

CREATE TRIGGER trg_sources_updated_at
AFTER UPDATE ON sources
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE sources SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_source_evidence_updated_at
AFTER UPDATE ON source_evidence
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE source_evidence SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_provenance_records_updated_at
AFTER UPDATE ON provenance_records
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE provenance_records SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_current_truth_source_guard
BEFORE UPDATE OF current_truth_eligible, verification_status, access_scope ON sources
FOR EACH ROW
WHEN NEW.current_truth_eligible = 1
 AND (NEW.verification_status <> 'VERIFIED' OR NEW.access_scope = 'PRIVATE_ADMIN')
BEGIN
    SELECT RAISE(ABORT, 'current-truth source must be verified and non-private');
END;

-- Batch 010 / 012_publication.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Publication governance is a separate state machine from document ingestion and review.

PRAGMA foreign_keys = ON;

CREATE TABLE publications (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    document_id TEXT REFERENCES documents(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    document_version_id TEXT REFERENCES document_versions(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    audience_scope TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (
        audience_scope IN ('PUBLIC','INTERNAL','PRIVATE_ADMIN')
    ),
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (
        status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PUBLISHED','UNPUBLISHED','ARCHIVED','REJECTED')
    ),
    visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (
        visibility IN ('PUBLIC','UNLISTED','INTERNAL','PRIVATE_ADMIN')
    ),
    canonical_path TEXT,
    canonical_url TEXT,
    locale TEXT,
    title_bn TEXT,
    title_en TEXT,
    summary_bn TEXT,
    summary_en TEXT,
    seo_description_bn TEXT,
    seo_description_en TEXT,
    published_at TEXT,
    unpublished_at TEXT,
    archived_at TEXT,
    approved_at TEXT,
    approved_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    approval_revision_id TEXT,
    public_snapshot_hash TEXT,
    stale_at TEXT,
    source_verification_required INTEGER NOT NULL DEFAULT 1 CHECK (source_verification_required IN (0,1)),
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    revision_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (audience_scope <> 'PUBLIC' OR visibility IN ('PUBLIC','UNLISTED')),
    CHECK (status <> 'PUBLISHED' OR (audience_scope = 'PUBLIC' AND visibility = 'PUBLIC' AND published_at IS NOT NULL AND approved_at IS NOT NULL)),
    CHECK (status = 'APPROVED' OR approved_at IS NULL OR status IN ('PUBLISHED','UNPUBLISHED','ARCHIVED')),
    CHECK (status <> 'ARCHIVED' OR archived_at IS NOT NULL),
    CHECK (status <> 'UNPUBLISHED' OR unpublished_at IS NOT NULL),
    UNIQUE (entity_type, entity_id, document_version_id, locale)
);

CREATE INDEX idx_publications_status_audience
    ON publications (status, audience_scope, visibility);
CREATE INDEX idx_publications_document
    ON publications (document_id, document_version_id, status);
CREATE INDEX idx_publications_path
    ON publications (canonical_path, status);
CREATE INDEX idx_publications_stale
    ON publications (stale_at, status);
CREATE INDEX idx_publications_approved_by
    ON publications (approved_by_user_id, approved_at);

CREATE TABLE publication_approvals (
    id TEXT PRIMARY KEY,
    publication_id TEXT NOT NULL REFERENCES publications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    decision TEXT NOT NULL CHECK (
        decision IN ('PENDING','APPROVED','REJECTED','CHANGES_REQUESTED','REVOKED')
    ),
    approver_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    approval_scope TEXT NOT NULL CHECK (
        approval_scope IN ('METADATA','CONTENT','PUBLICATION','UNPUBLISH','ARCHIVE')
    ),
    reason_private TEXT,
    approved_at TEXT,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE,
    created_at TEXT NOT NULL,
    CHECK (decision = 'PENDING' OR approved_at IS NOT NULL)
);

CREATE INDEX idx_publication_approvals_publication
    ON publication_approvals (publication_id, approval_scope, decision);
CREATE INDEX idx_publication_approvals_approver
    ON publication_approvals (approver_user_id, approved_at);

CREATE TABLE public_document_pages (
    id TEXT PRIMARY KEY,
    publication_id TEXT NOT NULL UNIQUE REFERENCES publications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    document_id TEXT NOT NULL REFERENCES documents(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    route_slug TEXT NOT NULL UNIQUE,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    document_type TEXT NOT NULL,
    document_date TEXT,
    issuer_public TEXT,
    authority_public TEXT,
    verification_label_bn TEXT,
    verification_label_en TEXT,
    provenance_summary_bn TEXT,
    provenance_summary_en TEXT,
    download_enabled INTEGER NOT NULL DEFAULT 1 CHECK (download_enabled IN (0,1)),
    preview_enabled INTEGER NOT NULL DEFAULT 0 CHECK (preview_enabled IN (0,1)),
    viewer_type TEXT NOT NULL DEFAULT 'NONE' CHECK (
        viewer_type IN ('NONE','PDF','WORD_RENDERED','EXCEL_TABLE','IMAGE')
    ),
    search_index_enabled INTEGER NOT NULL DEFAULT 1 CHECK (search_index_enabled IN (0,1)),
    ai_grounding_enabled INTEGER NOT NULL DEFAULT 0 CHECK (ai_grounding_enabled IN (0,1)),
    public_handle TEXT,
    published_at TEXT,
    updated_at TEXT NOT NULL,
    CHECK (ai_grounding_enabled IN (0,1)),
    CHECK (download_enabled = 0 OR public_handle IS NOT NULL),
    CHECK (preview_enabled = 0 OR viewer_type <> 'NONE')
);

CREATE INDEX idx_public_document_pages_document
    ON public_document_pages (document_id, published_at);
CREATE INDEX idx_public_document_pages_search_ai
    ON public_document_pages (search_index_enabled, ai_grounding_enabled);

CREATE TABLE publication_events (
    id TEXT PRIMARY KEY,
    publication_id TEXT NOT NULL REFERENCES publications(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (
        to_status IN ('DRAFT','PENDING_APPROVAL','APPROVED','PUBLISHED','UNPUBLISHED','ARCHIVED','REJECTED')
    ),
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    actor_role TEXT,
    occurred_at TEXT NOT NULL,
    reason_code TEXT NOT NULL,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_publication_events_publication_time
    ON publication_events (publication_id, occurred_at);
CREATE INDEX idx_publication_events_idempotency
    ON publication_events (idempotency_key_hash);

CREATE TRIGGER trg_publications_updated_at
AFTER UPDATE ON publications
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE publications SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_publications_publish_guard
BEFORE INSERT ON publications
FOR EACH ROW
WHEN NEW.status = 'PUBLISHED'
 AND (
    NEW.audience_scope <> 'PUBLIC'
    OR NEW.visibility <> 'PUBLIC'
    OR NEW.published_at IS NULL
    OR NEW.approved_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'publication cannot be inserted as published without public visibility and approval');
END;

CREATE TRIGGER trg_publications_publish_update_guard
BEFORE UPDATE OF status, audience_scope, visibility, published_at, approved_at ON publications
FOR EACH ROW
WHEN NEW.status = 'PUBLISHED'
 AND (
    NEW.audience_scope <> 'PUBLIC'
    OR NEW.visibility <> 'PUBLIC'
    OR NEW.published_at IS NULL
    OR NEW.approved_at IS NULL
)
BEGIN
    SELECT RAISE(ABORT, 'publication cannot be published without public visibility and approval');
END;

CREATE TRIGGER trg_public_document_page_publicity_guard
BEFORE INSERT ON public_document_pages
FOR EACH ROW
WHEN NOT EXISTS (
    SELECT 1
    FROM publications p
    JOIN documents d ON d.id = NEW.document_id
    WHERE p.id = NEW.publication_id
      AND p.entity_type = 'DOCUMENT'
      AND p.document_id = NEW.document_id
      AND p.entity_id = NEW.document_id
      AND p.status = 'PUBLISHED'
      AND p.audience_scope = 'PUBLIC'
      AND p.visibility = 'PUBLIC'
      AND d.public_private = 'PUBLIC'
      AND d.access_policy = 'APPROVED_PUBLIC'
      AND d.state IN ('APPROVED','PUBLISHED','ARCHIVED')
      AND d.verification_status = 'VERIFIED'
)
BEGIN
    SELECT RAISE(ABORT, 'public document page requires a published public verified document');
END;

CREATE TRIGGER trg_publication_source_verification_guard
BEFORE INSERT ON publications
FOR EACH ROW
WHEN NEW.status IN ('APPROVED','PUBLISHED')
 AND NEW.source_verification_required = 1
 AND NEW.document_id IS NOT NULL
 AND EXISTS (
     SELECT 1 FROM documents d WHERE d.id = NEW.document_id AND d.verification_status <> 'VERIFIED'
 )
BEGIN
    SELECT RAISE(ABORT, 'publication requires verified document source status');
END;

CREATE TRIGGER trg_publication_source_verification_update_guard
BEFORE UPDATE OF status, source_verification_required, document_id ON publications
FOR EACH ROW
WHEN NEW.status IN ('APPROVED','PUBLISHED')
 AND NEW.source_verification_required = 1
 AND NEW.document_id IS NOT NULL
 AND EXISTS (
     SELECT 1 FROM documents d WHERE d.id = NEW.document_id AND d.verification_status <> 'VERIFIED'
 )
BEGIN
    SELECT RAISE(ABORT, 'publication requires verified document source status');
END;

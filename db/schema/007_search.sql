-- Batch 009 / 007_search.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Search read-model schema. Only audience-approved, non-private content belongs here.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS search_documents (
    id TEXT PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    locale TEXT NOT NULL CHECK (locale IN ('bn', 'en', 'bn-IN', 'en-IN')),
    title TEXT NOT NULL,
    summary TEXT,
    body TEXT NOT NULL,
    keywords TEXT,
    canonical_path TEXT,
    audience_scope TEXT NOT NULL DEFAULT 'PUBLIC'
        CHECK (audience_scope IN ('PUBLIC', 'INTERNAL')),
    publication_status TEXT NOT NULL DEFAULT 'PUBLISHED'
        CHECK (publication_status IN ('APPROVED', 'PUBLISHED', 'ARCHIVED')),
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED'
        CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'REVIEW_REQUIRED')),
    source_ids_json TEXT NOT NULL DEFAULT '[]'
        CHECK (json_valid(source_ids_json)),
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    indexed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    CHECK (audience_scope <> 'PUBLIC' OR publication_status = 'PUBLISHED'),
    CHECK (audience_scope <> 'PUBLIC' OR verification_status = 'VERIFIED'),
    UNIQUE (entity_type, entity_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_search_documents_entity_status
    ON search_documents (entity_type, entity_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_search_documents_status_locale
    ON search_documents (publication_status, locale, audience_scope);
CREATE INDEX IF NOT EXISTS idx_search_documents_updated
    ON search_documents (updated_at);

CREATE TRIGGER IF NOT EXISTS trg_search_documents_public_guard_insert
BEFORE INSERT ON search_documents
WHEN NEW.audience_scope = 'PUBLIC'
 AND (NEW.publication_status <> 'PUBLISHED' OR NEW.verification_status <> 'VERIFIED')
BEGIN
    SELECT RAISE(ABORT, 'public search document must be published and verified');
END;

CREATE TRIGGER IF NOT EXISTS trg_search_documents_public_guard_update
BEFORE UPDATE OF audience_scope, publication_status, verification_status ON search_documents
WHEN NEW.audience_scope = 'PUBLIC'
 AND (NEW.publication_status <> 'PUBLISHED' OR NEW.verification_status <> 'VERIFIED')
BEGIN
    SELECT RAISE(ABORT, 'public search document must be published and verified');
END;

CREATE TRIGGER IF NOT EXISTS trg_search_documents_no_sensitive_entity_type
BEFORE INSERT ON search_documents
WHEN lower(NEW.entity_type) IN (
    'supportticket', 'supportmessage', 'supportattachment', 'supportassignment',
    'supportinternalnote', 'emaildispatch', 'emailevent', 'donation', 'donationattempt',
    'donationverification', 'user', 'userrole', 'permission', 'privatecontact'
)
 AND NEW.audience_scope = 'PUBLIC'
BEGIN
    SELECT RAISE(ABORT, 'private or administrative entity cannot enter public search index');
END;

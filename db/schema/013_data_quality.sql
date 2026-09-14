-- Batch 011 / 013_data_quality.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Contract families: CTR-05101–CTR-05200 (DATABASE), CTR-06401–CTR-06500 (MIGRATION), CTR-05701–CTR-05800 (DATAQUALITY)
-- Data-quality records are diagnostic/corrective metadata; they never become an alternate canonical truth source.

PRAGMA foreign_keys = ON;

CREATE TABLE data_quality_rules (
    id TEXT PRIMARY KEY,
    rule_code TEXT NOT NULL UNIQUE,
    rule_version INTEGER NOT NULL CHECK (rule_version > 0),
    name_bn TEXT NOT NULL,
    name_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    rule_family TEXT NOT NULL CHECK (
        rule_family IN ('VALIDATION','ORPHAN_DETECTION','DUPLICATE_DETECTION','CORRECTION','CONSISTENCY','PROVENANCE')
    ),
    scope_entity_type TEXT NOT NULL,
    severity_default TEXT NOT NULL DEFAULT 'MEDIUM' CHECK (
        severity_default IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')
    ),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    deterministic_key TEXT NOT NULL,
    rule_definition_json TEXT NOT NULL CHECK (json_valid(rule_definition_json)),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (
        verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED','REVIEW_REQUIRED')
    ),
    revision_id TEXT,
    created_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rule_code, rule_version),
    CHECK (verification_status = 'VERIFIED' OR enabled = 0)
);

CREATE INDEX idx_dq_rules_family_scope
    ON data_quality_rules (rule_family, scope_entity_type, enabled);
CREATE INDEX idx_dq_rules_updated
    ON data_quality_rules (updated_at);

CREATE TABLE data_quality_runs (
    id TEXT PRIMARY KEY,
    run_key_hash TEXT NOT NULL UNIQUE,
    run_type TEXT NOT NULL CHECK (
        run_type IN ('VALIDATION','ORPHAN_SCAN','DUPLICATE_SCAN','CORRECTION_RECHECK','FULL_AUDIT')
    ),
    requested_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (
        status IN ('QUEUED','RUNNING','SUCCEEDED','PARTIAL','FAILED','CANCELLED','NO_DATA')
    ),
    input_snapshot_hash TEXT,
    canonical_revision_id TEXT,
    findings_count INTEGER NOT NULL DEFAULT 0 CHECK (findings_count >= 0),
    error_code TEXT,
    error_detail_private TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (completed_at IS NULL OR completed_at >= started_at),
    CHECK (status IN ('QUEUED','RUNNING') OR completed_at IS NOT NULL)
);

CREATE INDEX idx_dq_runs_status_time
    ON data_quality_runs (status, started_at);
CREATE INDEX idx_dq_runs_type_time
    ON data_quality_runs (run_type, started_at);

CREATE TABLE data_quality_issues (
    id TEXT PRIMARY KEY,
    run_id TEXT REFERENCES data_quality_runs(id) ON UPDATE CASCADE ON DELETE SET NULL,
    rule_id TEXT NOT NULL REFERENCES data_quality_rules(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    issue_type TEXT NOT NULL CHECK (
        issue_type IN ('INVALID','CONTRADICTORY','ORPHAN','DUPLICATE','STALE','MISSING_PROVENANCE','CORRECTION_REQUIRED','OTHER')
    ),
    severity TEXT NOT NULL CHECK (severity IN ('INFO','LOW','MEDIUM','HIGH','CRITICAL')),
    field_name TEXT,
    observed_value_hash TEXT,
    expected_value_hash TEXT,
    message_bn TEXT,
    message_en TEXT,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (
        status IN ('OPEN','ACKNOWLEDGED','IN_REVIEW','CORRECTED','REJECTED','WONT_FIX','SUPERSEDED','CLOSED')
    ),
    first_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at TEXT,
    resolution_code TEXT,
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    evidence_id TEXT REFERENCES source_evidence(id) ON UPDATE CASCADE ON DELETE SET NULL,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rule_id, entity_type, entity_id, issue_type, field_name, observed_value_hash),
    CHECK (last_seen_at >= first_seen_at),
    CHECK (resolved_at IS NULL OR resolved_at >= first_seen_at),
    CHECK (status NOT IN ('CORRECTED','REJECTED','WONT_FIX','SUPERSEDED','CLOSED') OR resolved_at IS NOT NULL)
);

CREATE INDEX idx_dq_issues_entity_status
    ON data_quality_issues (entity_type, entity_id, status);
CREATE INDEX idx_dq_issues_rule_status
    ON data_quality_issues (rule_id, status, severity);
CREATE INDEX idx_dq_issues_run
    ON data_quality_issues (run_id, status);
CREATE INDEX idx_dq_issues_source
    ON data_quality_issues (source_id, evidence_id);

CREATE TABLE data_quality_issue_events (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES data_quality_issues(id) ON UPDATE CASCADE ON DELETE CASCADE,
    from_status TEXT,
    to_status TEXT NOT NULL CHECK (
        to_status IN ('OPEN','ACKNOWLEDGED','IN_REVIEW','CORRECTED','REJECTED','WONT_FIX','SUPERSEDED','CLOSED')
    ),
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    reason_code TEXT NOT NULL,
    note_private TEXT,
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revision_id TEXT,
    idempotency_key_hash TEXT UNIQUE,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json))
);

CREATE INDEX idx_dq_issue_events_issue_time
    ON data_quality_issue_events (issue_id, occurred_at);

CREATE TRIGGER trg_dq_issue_events_immutable_update
BEFORE UPDATE ON data_quality_issue_events
BEGIN
    SELECT RAISE(ABORT, 'data-quality issue events are immutable');
END;

CREATE TRIGGER trg_dq_issue_events_immutable_delete
BEFORE DELETE ON data_quality_issue_events
BEGIN
    SELECT RAISE(ABORT, 'data-quality issue events are immutable');
END;

CREATE TABLE data_quality_corrections (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES data_quality_issues(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    target_entity_type TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    correction_type TEXT NOT NULL CHECK (
        correction_type IN ('FIELD_UPDATE','STATUS_UPDATE','REFERENCE_UPDATE','DELETE_REPLACEMENT','SOURCE_REPLACEMENT','OTHER')
    ),
    before_snapshot_json TEXT NOT NULL CHECK (json_valid(before_snapshot_json)),
    after_snapshot_json TEXT NOT NULL CHECK (json_valid(after_snapshot_json)),
    patch_json TEXT CHECK (patch_json IS NULL OR json_valid(patch_json)),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    evidence_id TEXT REFERENCES source_evidence(id) ON UPDATE CASCADE ON DELETE SET NULL,
    authorization_basis TEXT NOT NULL,
    applied_by_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    applied_at TEXT,
    status TEXT NOT NULL DEFAULT 'PROPOSED' CHECK (
        status IN ('PROPOSED','APPROVED','APPLIED','REJECTED','ROLLED_BACK','CONFLICT')
    ),
    idempotency_key_hash TEXT UNIQUE,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (status IN ('PROPOSED','APPROVED','REJECTED','CONFLICT') OR applied_at IS NOT NULL),
    CHECK (status <> 'APPLIED' OR applied_by_user_id IS NOT NULL)
);

CREATE INDEX idx_dq_corrections_issue_status
    ON data_quality_corrections (issue_id, status);
CREATE INDEX idx_dq_corrections_target
    ON data_quality_corrections (target_entity_type, target_entity_id, status);

CREATE TABLE data_quality_rule_bindings (
    id TEXT PRIMARY KEY,
    rule_id TEXT NOT NULL REFERENCES data_quality_rules(id) ON UPDATE CASCADE ON DELETE CASCADE,
    entity_type TEXT NOT NULL,
    entity_field TEXT,
    binding_kind TEXT NOT NULL CHECK (
        binding_kind IN ('FIELD','RELATION','UNIQUE_KEY','STATE_MACHINE','PUBLIC_SERIALIZER','PROVENANCE')
    ),
    binding_definition_json TEXT NOT NULL CHECK (json_valid(binding_definition_json)),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0,1)),
    source_id TEXT REFERENCES sources(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (rule_id, entity_type, entity_field, binding_kind)
);

CREATE INDEX idx_dq_bindings_entity
    ON data_quality_rule_bindings (entity_type, entity_field, enabled);

CREATE TRIGGER trg_dq_rules_updated_at
AFTER UPDATE ON data_quality_rules
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE data_quality_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_dq_runs_updated_at
AFTER UPDATE ON data_quality_runs
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE data_quality_runs SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_dq_issues_updated_at
AFTER UPDATE ON data_quality_issues
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE data_quality_issues SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_dq_corrections_updated_at
AFTER UPDATE ON data_quality_corrections
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE data_quality_corrections SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

CREATE TRIGGER trg_dq_bindings_updated_at
AFTER UPDATE ON data_quality_rule_bindings
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
    UPDATE data_quality_rule_bindings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

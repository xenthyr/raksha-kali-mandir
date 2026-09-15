-- Batch 020A — authentication foundation / persistence / provisioning
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Extends the existing users/RBAC model; does not create a parallel identity model.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1 CHECK (must_change_password IN (0,1));
ALTER TABLE users ADD COLUMN password_kdf_version TEXT;
ALTER TABLE users ADD COLUMN password_changed_at TEXT;
ALTER TABLE users ADD COLUMN credential_provisioned_at TEXT;
ALTER TABLE users ADD COLUMN credential_provisioning_reference TEXT;

CREATE INDEX idx_users_auth_lookup_username
    ON users (username, status, deleted_at);
CREATE INDEX idx_users_auth_lookup_phone
    ON users (phone_normalized, status, deleted_at);
CREATE INDEX idx_users_auth_setup
    ON users (must_change_password, status, deleted_at);

CREATE TABLE auth_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    revoked_at TEXT,
    revoke_reason TEXT,
    user_agent_hash TEXT,
    ip_hash TEXT,
    revision_id TEXT,
    UNIQUE (id),
    CHECK (expires_at > created_at),
    CHECK (revoked_at IS NULL OR revoked_at >= created_at)
);

CREATE INDEX idx_auth_sessions_user_state
    ON auth_sessions (user_id, revoked_at, expires_at);
CREATE INDEX idx_auth_sessions_expiry
    ON auth_sessions (expires_at, revoked_at);

CREATE TABLE auth_password_reset_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TEXT NOT NULL,
    consumed_at TEXT,
    invalidated_at TEXT,
    requested_ip_hash TEXT,
    requested_user_agent_hash TEXT,
    revision_id TEXT,
    CHECK (expires_at > created_at),
    CHECK (consumed_at IS NULL OR consumed_at >= created_at),
    CHECK (invalidated_at IS NULL OR invalidated_at >= created_at),
    CHECK (NOT (consumed_at IS NOT NULL AND invalidated_at IS NOT NULL))
);

CREATE INDEX idx_auth_reset_user_state
    ON auth_password_reset_tokens (user_id, consumed_at, invalidated_at, expires_at);
CREATE INDEX idx_auth_reset_expiry
    ON auth_password_reset_tokens (expires_at, consumed_at, invalidated_at);

CREATE TABLE auth_rate_limits (
    id TEXT PRIMARY KEY,
    bucket_key_hash TEXT NOT NULL,
    operation TEXT NOT NULL CHECK (operation IN ('LOGIN','PASSWORD_RESET_REQUEST','PASSWORD_RESET_CONFIRM')),
    window_started_at TEXT NOT NULL,
    window_expires_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    blocked_until TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (bucket_key_hash, operation, window_started_at),
    CHECK (window_expires_at > window_started_at),
    CHECK (blocked_until IS NULL OR blocked_until >= window_started_at)
);

CREATE INDEX idx_auth_rate_limits_active
    ON auth_rate_limits (bucket_key_hash, operation, window_expires_at, blocked_until);

CREATE TRIGGER trg_auth_sessions_immutable_identity
BEFORE UPDATE OF id, user_id, created_at ON auth_sessions
FOR EACH ROW
WHEN NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.created_at <> OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'authentication session identity is immutable');
END;

CREATE TRIGGER trg_auth_reset_token_immutable_identity
BEFORE UPDATE OF id, user_id, token_hash, created_at ON auth_password_reset_tokens
FOR EACH ROW
WHEN NEW.id <> OLD.id OR NEW.user_id <> OLD.user_id OR NEW.token_hash <> OLD.token_hash OR NEW.created_at <> OLD.created_at
BEGIN
    SELECT RAISE(ABORT, 'password reset token identity is immutable');
END;

CREATE TRIGGER trg_auth_reset_token_single_use
BEFORE UPDATE OF consumed_at, invalidated_at ON auth_password_reset_tokens
FOR EACH ROW
WHEN OLD.consumed_at IS NOT NULL AND NEW.consumed_at IS NULL
   OR OLD.invalidated_at IS NOT NULL AND NEW.invalidated_at IS NULL
   OR (OLD.consumed_at IS NOT NULL AND NEW.invalidated_at IS NOT NULL)
   OR (OLD.invalidated_at IS NOT NULL AND NEW.consumed_at IS NOT NULL)
BEGIN
    SELECT RAISE(ABORT, 'password reset token lifecycle is one-way');
END;

CREATE TABLE auth_audit_events (
    id TEXT PRIMARY KEY,
    actor_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    subject_user_id TEXT REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (
        action IN (
            'LOGIN_SUCCESS','LOGIN_FAILURE','LOGIN_RATE_LIMITED','LOGOUT',
            'SESSION_REVOKED','PASSWORD_INITIALIZED','PASSWORD_CHANGED',
            'PASSWORD_RESET_REQUESTED','PASSWORD_RESET_SUCCEEDED',
            'PASSWORD_RESET_FAILED','PASSWORD_RESET_RATE_LIMITED',
            'ACCOUNT_PROVISIONED','ACCOUNT_DISABLED','ACCOUNT_UNLOCKED'
        )
    ),
    result TEXT NOT NULL CHECK (result IN ('SUCCESS','DENIED','CONFLICT','INVALID','NOT_FOUND','FAILURE')),
    request_id TEXT,
    reason_code TEXT,
    metadata_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(metadata_json)),
    occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_auth_audit_subject_time
    ON auth_audit_events (subject_user_id, occurred_at);
CREATE INDEX idx_auth_audit_actor_time
    ON auth_audit_events (actor_user_id, occurred_at);
CREATE INDEX idx_auth_audit_action_time
    ON auth_audit_events (action, occurred_at);

CREATE TRIGGER trg_auth_audit_events_immutable_update
BEFORE UPDATE ON auth_audit_events
BEGIN
    SELECT RAISE(ABORT, 'authentication audit events are immutable');
END;

CREATE TRIGGER trg_auth_audit_events_immutable_delete
BEFORE DELETE ON auth_audit_events
BEGIN
    SELECT RAISE(ABORT, 'authentication audit events are immutable');
END;

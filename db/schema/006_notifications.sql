-- Batch 008 / 006_notifications.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- D1/SQLite notification subscriptions, notifications and idempotent dispatch schema.
-- Provider credentials (for example VAPID private keys or email API keys) never belong in this schema.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    notification_type TEXT NOT NULL
        CHECK (notification_type IN ('AMAVASYA', 'SPECIAL_PUJA', 'FESTIVAL', 'OFFICIAL_NOTICE', 'LIVE_EVENT', 'VOLUNTEER_DUTY', 'EMERGENCY')),
    title_bn TEXT NOT NULL,
    title_en TEXT,
    body_bn TEXT NOT NULL,
    body_en TEXT,
    related_entity_type TEXT,
    related_entity_id TEXT,
    audience_code TEXT NOT NULL DEFAULT 'PUBLIC',
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED', 'ARCHIVED')),
    dedupe_key TEXT NOT NULL UNIQUE,
    scheduled_at TEXT,
    expires_at TEXT,
    queued_at TEXT,
    sent_at TEXT,
    failure_code TEXT,
    failure_detail_private TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (expires_at IS NULL OR scheduled_at IS NULL OR expires_at >= scheduled_at)
);

CREATE TABLE IF NOT EXISTS notification_subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    anonymous_installation_id TEXT,
    endpoint_hash TEXT NOT NULL UNIQUE,
    endpoint_opaque TEXT NOT NULL,
    p256dh_opaque TEXT NOT NULL,
    auth_opaque TEXT NOT NULL,
    browser_family TEXT,
    locale TEXT,
    permission_status TEXT NOT NULL DEFAULT 'GRANTED'
        CHECK (permission_status IN ('GRANTED', 'DENIED', 'PROMPT', 'REVOKED')),
    enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
    amavasya_enabled INTEGER NOT NULL DEFAULT 1 CHECK (amavasya_enabled IN (0, 1)),
    special_puja_enabled INTEGER NOT NULL DEFAULT 1 CHECK (special_puja_enabled IN (0, 1)),
    festival_enabled INTEGER NOT NULL DEFAULT 1 CHECK (festival_enabled IN (0, 1)),
    notice_enabled INTEGER NOT NULL DEFAULT 1 CHECK (notice_enabled IN (0, 1)),
    live_enabled INTEGER NOT NULL DEFAULT 1 CHECK (live_enabled IN (0, 1)),
    volunteer_enabled INTEGER NOT NULL DEFAULT 1 CHECK (volunteer_enabled IN (0, 1)),
    emergency_enabled INTEGER NOT NULL DEFAULT 1 CHECK (emergency_enabled IN (0, 1)),
    last_seen_at TEXT,
    revoked_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (user_id IS NOT NULL OR anonymous_installation_id IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS notification_dispatches (
    id TEXT PRIMARY KEY,
    notification_id TEXT NOT NULL,
    subscription_id TEXT NOT NULL,
    channel TEXT NOT NULL DEFAULT 'PUSH'
        CHECK (channel IN ('PUSH')),
    status TEXT NOT NULL DEFAULT 'QUEUED'
        CHECK (status IN ('QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BLOCKED', 'SUPPRESSED')),
    idempotency_key TEXT NOT NULL UNIQUE,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    provider_message_id_private TEXT,
    provider_status_private TEXT,
    failure_code TEXT,
    failure_detail_private TEXT,
    next_attempt_at TEXT,
    queued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at TEXT,
    delivered_at TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (notification_id) REFERENCES notifications(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (subscription_id) REFERENCES notification_subscriptions(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (notification_id, subscription_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_notifications_type_status_schedule
    ON notifications (notification_type, status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notifications_related
    ON notifications (related_entity_type, related_entity_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_status_created
    ON notifications (status, created_at);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_status
    ON notification_subscriptions (permission_status, enabled, updated_at);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user
    ON notification_subscriptions (user_id, enabled);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_installation
    ON notification_subscriptions (anonymous_installation_id, enabled);
CREATE INDEX IF NOT EXISTS idx_notification_dispatches_notification_status
    ON notification_dispatches (notification_id, status, queued_at);
CREATE INDEX IF NOT EXISTS idx_notification_dispatches_subscription_status
    ON notification_dispatches (subscription_id, status, queued_at);
CREATE INDEX IF NOT EXISTS idx_notification_dispatches_retry
    ON notification_dispatches (status, next_attempt_at);

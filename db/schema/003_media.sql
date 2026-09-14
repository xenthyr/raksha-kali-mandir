-- Batch 007 / 003_media.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Event-based media metadata with approval/publication governance and private B2 object references.
-- Binary objects are never stored in the relational database.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS darshan_events (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    event_type TEXT NOT NULL
        CHECK (event_type IN ('AMAVASYA', 'SPECIAL_PUJA', 'FESTIVAL', 'DARSHAN', 'OTHER')),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS media_albums (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    darshan_event_id TEXT,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    cover_media_item_id TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (darshan_event_id) REFERENCES darshan_events(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS media_items (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    album_id TEXT,
    darshan_event_id TEXT,
    media_type TEXT NOT NULL
        CHECK (media_type IN ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'OTHER')),
    title_bn TEXT,
    title_en TEXT,
    caption_bn TEXT,
    caption_en TEXT,
    original_filename TEXT,
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    storage_provider TEXT NOT NULL DEFAULT 'BACKBLAZE_B2'
        CHECK (storage_provider = 'BACKBLAZE_B2'),
    object_key TEXT NOT NULL,
    storage_visibility TEXT NOT NULL DEFAULT 'PRIVATE'
        CHECK (storage_visibility = 'PRIVATE'),
    checksum_sha256 TEXT,
    width_px INTEGER,
    height_px INTEGER,
    duration_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'UPLOADED', 'PROCESSING', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'REJECTED')),
    uploaded_by_user_id TEXT,
    published_at TEXT,
    archived_at TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (album_id) REFERENCES media_albums(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (darshan_event_id) REFERENCES darshan_events(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    UNIQUE (storage_provider, object_key)
);

CREATE TABLE IF NOT EXISTS darshan_photos (
    id TEXT PRIMARY KEY,
    darshan_event_id TEXT NOT NULL,
    media_item_id TEXT NOT NULL,
    display_order INTEGER NOT NULL CHECK (display_order > 0),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (darshan_event_id) REFERENCES darshan_events(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (darshan_event_id, display_order),
    UNIQUE (darshan_event_id, media_item_id)
);

CREATE TABLE IF NOT EXISTS media_derivatives (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    derivative_type TEXT NOT NULL
        CHECK (derivative_type IN ('THUMBNAIL', 'PROCESSED', 'OG', 'POSTER', 'WAVEFORM', 'OTHER')),
    mime_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
    object_key TEXT NOT NULL,
    checksum_sha256 TEXT,
    width_px INTEGER,
    height_px INTEGER,
    duration_ms INTEGER,
    status TEXT NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (media_item_id, derivative_type)
);

CREATE TABLE IF NOT EXISTS media_rights (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL,
    rights_status TEXT NOT NULL
        CHECK (rights_status IN ('UNKNOWN', 'PENDING', 'CLEARED', 'RESTRICTED', 'REVOKED')),
    rights_type TEXT,
    rights_holder TEXT,
    license_text TEXT,
    permission_reference TEXT,
    verified_by_user_id TEXT,
    verified_at TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS live_streams (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    media_item_id TEXT,
    platform TEXT NOT NULL,
    public_url TEXT,
    scheduled_start_at TEXT,
    scheduled_end_at TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'LIVE', 'ENDED', 'CANCELLED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK (scheduled_end_at IS NULL OR scheduled_start_at IS NULL OR scheduled_end_at >= scheduled_start_at)
);

CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL UNIQUE,
    duration_ms INTEGER,
    poster_derivative_id TEXT,
    captions_available INTEGER NOT NULL DEFAULT 0 CHECK (captions_available IN (0, 1)),
    transcript_available INTEGER NOT NULL DEFAULT 0 CHECK (transcript_available IN (0, 1)),
    autoplay_allowed INTEGER NOT NULL DEFAULT 0 CHECK (autoplay_allowed IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audio_tracks (
    id TEXT PRIMARY KEY,
    media_item_id TEXT NOT NULL UNIQUE,
    duration_ms INTEGER,
    transcript_available INTEGER NOT NULL DEFAULT 0 CHECK (transcript_available IN (0, 1)),
    autoplay_allowed INTEGER NOT NULL DEFAULT 0 CHECK (autoplay_allowed IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (media_item_id) REFERENCES media_items(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_darshan_events_temple_date_status
    ON darshan_events (temple_id, event_date, status);
CREATE INDEX IF NOT EXISTS idx_media_albums_temple_status
    ON media_albums (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_media_items_event_status_date
    ON media_items (darshan_event_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_media_items_album_status
    ON media_items (album_id, status);
CREATE INDEX IF NOT EXISTS idx_media_items_type_status
    ON media_items (media_type, status);
CREATE INDEX IF NOT EXISTS idx_media_rights_status
    ON media_rights (rights_status, status);
CREATE INDEX IF NOT EXISTS idx_media_derivatives_item_status
    ON media_derivatives (media_item_id, status);
CREATE INDEX IF NOT EXISTS idx_live_streams_temple_status
    ON live_streams (temple_id, status, scheduled_start_at);

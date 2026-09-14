-- Batch 009 / 009_music.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Rights-aware devotional music library. Binary objects remain private in B2.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS music_sources (
    id TEXT PRIMARY KEY,
    source_type TEXT NOT NULL CHECK (source_type IN ('TEMPLE_ORIGINAL', 'COMMITTEE_SUBMISSION', 'LICENSED_SOURCE', 'PUBLIC_DOMAIN', 'EXTERNAL_REFERENCE', 'OTHER')),
    title TEXT,
    issuer TEXT,
    source_id TEXT,
    provenance_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    notes_private TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS music_rights (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL
        CHECK (status IN ('OWNED_BY_TEMPLE', 'LICENSED', 'PUBLIC_DOMAIN', 'PERMITTED_EXTERNAL_EMBED', 'UNKNOWN_NOT_PUBLISHABLE')),
    rights_holder TEXT,
    license_reference_private TEXT,
    license_url TEXT,
    territory TEXT,
    valid_from TEXT,
    valid_until TEXT,
    allowed_public_playback INTEGER NOT NULL DEFAULT 0 CHECK (allowed_public_playback IN (0, 1)),
    offline_eligible INTEGER NOT NULL DEFAULT 0 CHECK (offline_eligible IN (0, 1)),
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    archived_at TEXT,
    CHECK (valid_until IS NULL OR valid_from IS NULL OR valid_until >= valid_from),
    CHECK (status <> 'UNKNOWN_NOT_PUBLISHABLE' OR allowed_public_playback = 0),
    CHECK (offline_eligible = 0 OR status IN ('OWNED_BY_TEMPLE', 'LICENSED', 'PUBLIC_DOMAIN'))
);

CREATE TABLE IF NOT EXISTS music_tracks (
    id TEXT PRIMARY KEY,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    artist TEXT,
    singer TEXT,
    composer TEXT,
    lyricist TEXT,
    performer TEXT,
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    audio_object_key_private TEXT NOT NULL,
    cover_image_id TEXT,
    language TEXT NOT NULL,
    source_id TEXT,
    rights_id TEXT NOT NULL,
    event_id TEXT,
    event_type TEXT,
    festival_id TEXT,
    amavasya_id TEXT,
    transcript_id TEXT,
    translation_id TEXT,
    category TEXT NOT NULL,
    publication_status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (publication_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'BLOCKED')),
    security_scan_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (security_scan_status IN ('PENDING', 'PASSED', 'FAILED')),
    format_validation_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (format_validation_status IN ('PENDING', 'PASSED', 'FAILED')),
    metadata_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (metadata_status IN ('PENDING', 'EXTRACTED', 'FAILED')),
    user_triggered_only INTEGER NOT NULL DEFAULT 1 CHECK (user_triggered_only = 1),
    autoplay_sound_allowed INTEGER NOT NULL DEFAULT 0 CHECK (autoplay_sound_allowed = 0),
    offline_eligible INTEGER NOT NULL DEFAULT 0 CHECK (offline_eligible IN (0, 1)),
    source_provenance_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    published_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (rights_id) REFERENCES music_rights(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (amavasya_id) REFERENCES amavasyas(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (source_id) REFERENCES music_sources(id)
        ON UPDATE CASCADE ON DELETE SET NULL,
    CHECK (publication_status <> 'PUBLISHED' OR security_scan_status = 'PASSED'),
    CHECK (publication_status <> 'PUBLISHED' OR format_validation_status = 'PASSED'),
    CHECK (publication_status <> 'PUBLISHED' OR verification_status = 'VERIFIED')
);

CREATE INDEX IF NOT EXISTS idx_music_tracks_publication_category
    ON music_tracks (publication_status, category, updated_at);
CREATE INDEX IF NOT EXISTS idx_music_tracks_amavasya
    ON music_tracks (amavasya_id, publication_status);
CREATE INDEX IF NOT EXISTS idx_music_tracks_event
    ON music_tracks (event_type, event_id, publication_status);

CREATE TABLE IF NOT EXISTS music_albums (
    id TEXT PRIMARY KEY,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    cover_image_id TEXT,
    publication_status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (publication_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    published_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES music_sources(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS music_playlists (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    theme TEXT,
    event_id TEXT,
    event_type TEXT,
    publication_status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (publication_status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    published_at TEXT,
    archived_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (source_id) REFERENCES music_sources(id)
        ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS music_playlist_items (
    playlist_id TEXT NOT NULL,
    track_id TEXT NOT NULL,
    position INTEGER NOT NULL CHECK (position > 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (playlist_id, track_id),
    UNIQUE (playlist_id, position),
    FOREIGN KEY (playlist_id) REFERENCES music_playlists(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (track_id) REFERENCES music_tracks(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS music_publications (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    rights_id TEXT NOT NULL,
    state TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (state IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'BLOCKED')),
    approved_by TEXT,
    approved_at TEXT,
    published_at TEXT,
    blocked_reason TEXT,
    source_id TEXT,
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES music_tracks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (rights_id) REFERENCES music_rights(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (track_id)
);

CREATE TABLE IF NOT EXISTS music_transcripts (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    language TEXT NOT NULL,
    transcript_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES music_tracks(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS music_translations (
    id TEXT PRIMARY KEY,
    transcript_id TEXT NOT NULL,
    language TEXT NOT NULL,
    translated_text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transcript_id) REFERENCES music_transcripts(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS music_event_relations (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    relation_type TEXT NOT NULL CHECK (relation_type IN ('PRIMARY', 'RELATED', 'RECORDED_AT', 'DEDICATED_TO')),
    source_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES music_tracks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (track_id, event_id, event_type, relation_type)
);

CREATE TABLE IF NOT EXISTS music_derivatives (
    id TEXT PRIMARY KEY,
    track_id TEXT NOT NULL,
    format TEXT NOT NULL,
    codec TEXT,
    bitrate_kbps INTEGER CHECK (bitrate_kbps IS NULL OR bitrate_kbps > 0),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    object_key_private TEXT NOT NULL,
    security_scan_status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (security_scan_status IN ('PENDING', 'PASSED', 'FAILED')),
    status TEXT NOT NULL DEFAULT 'PROCESSING'
        CHECK (status IN ('PROCESSING', 'READY', 'FAILED', 'ARCHIVED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES music_tracks(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE (track_id, format, codec, bitrate_kbps)
);

CREATE INDEX IF NOT EXISTS idx_music_publications_state
    ON music_publications (state, published_at);
CREATE INDEX IF NOT EXISTS idx_music_transcripts_track_status
    ON music_transcripts (track_id, status, language);
CREATE INDEX IF NOT EXISTS idx_music_derivatives_track_status
    ON music_derivatives (track_id, status);

CREATE TRIGGER IF NOT EXISTS trg_music_rights_publication_guard
BEFORE INSERT ON music_publications
WHEN NEW.state = 'PUBLISHED'
 AND EXISTS (
     SELECT 1 FROM music_rights r
     WHERE r.id = NEW.rights_id
       AND (r.status = 'UNKNOWN_NOT_PUBLISHABLE' OR r.allowed_public_playback = 0)
 )
BEGIN
    SELECT RAISE(ABORT, 'music rights do not permit public publication');
END;

CREATE TRIGGER IF NOT EXISTS trg_music_rights_publication_update_guard
BEFORE UPDATE OF state, rights_id ON music_publications
WHEN NEW.state = 'PUBLISHED'
 AND EXISTS (
     SELECT 1 FROM music_rights r
     WHERE r.id = NEW.rights_id
       AND (r.status = 'UNKNOWN_NOT_PUBLISHABLE' OR r.allowed_public_playback = 0)
 )
BEGIN
    SELECT RAISE(ABORT, 'music rights do not permit public publication');
END;

CREATE TRIGGER IF NOT EXISTS trg_music_track_publish_rights_guard
BEFORE INSERT ON music_tracks
WHEN NEW.publication_status = 'PUBLISHED'
 AND EXISTS (
     SELECT 1 FROM music_rights r
     WHERE r.id = NEW.rights_id
       AND (r.status = 'UNKNOWN_NOT_PUBLISHABLE' OR r.allowed_public_playback = 0)
 )
BEGIN
    SELECT RAISE(ABORT, 'music track rights do not permit public publication');
END;

CREATE TRIGGER IF NOT EXISTS trg_music_track_publish_rights_update_guard
BEFORE UPDATE OF publication_status, rights_id ON music_tracks
WHEN NEW.publication_status = 'PUBLISHED'
 AND EXISTS (
     SELECT 1 FROM music_rights r
     WHERE r.id = NEW.rights_id
       AND (r.status = 'UNKNOWN_NOT_PUBLISHABLE' OR r.allowed_public_playback = 0)
 )
BEGIN
    SELECT RAISE(ABORT, 'music track rights do not permit public publication');
END;

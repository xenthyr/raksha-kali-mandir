-- Batch 007 — event-based media / private B2 D1/SQLite schema
-- Binary objects are never stored in the repository or DB; records point to private Backblaze B2 objects.

PRAGMA foreign_keys = ON;

CREATE TABLE darshan_events (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  observance_id TEXT,
  date TEXT NOT NULL,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  description_bn TEXT,
  description_en TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED','CANCELLED')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_darshan_events_date_status ON darshan_events(date, status);

CREATE TABLE media_albums (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  darshan_event_id TEXT REFERENCES darshan_events(id) ON UPDATE CASCADE ON DELETE SET NULL,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  description_bn TEXT,
  description_en TEXT,
  cover_media_item_id TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_media_albums_event_status ON media_albums(darshan_event_id, status);
CREATE INDEX idx_media_albums_temple_status ON media_albums(temple_id, status);

CREATE TABLE media_items (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  darshan_event_id TEXT REFERENCES darshan_events(id) ON UPDATE CASCADE ON DELETE SET NULL,
  album_id TEXT REFERENCES media_albums(id) ON UPDATE CASCADE ON DELETE SET NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE','VIDEO','AUDIO','DOCUMENT')),
  title_bn TEXT,
  title_en TEXT,
  caption_bn TEXT,
  caption_en TEXT,
  object_provider TEXT NOT NULL DEFAULT 'B2' CHECK (object_provider = 'B2'),
  bucket_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  object_etag TEXT,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 TEXT,
  storage_visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (storage_visibility = 'PRIVATE'),
  approval_status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (approval_status IN ('DRAFT','IN_REVIEW','APPROVED','REJECTED')),
  publication_status TEXT NOT NULL DEFAULT 'UNPUBLISHED' CHECK (publication_status IN ('UNPUBLISHED','PUBLISHED','ARCHIVED')),
  serving_mode TEXT NOT NULL DEFAULT 'SIGNED_URL' CHECK (serving_mode IN ('SIGNED_URL','AUTHORIZED_PROXY')),
  public_slug TEXT,
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (bucket_name, object_key),
  CHECK (publication_status <> 'PUBLISHED' OR approval_status = 'APPROVED')
);
CREATE INDEX idx_media_items_event_status_date ON media_items(darshan_event_id, publication_status, created_at);
CREATE INDEX idx_media_items_album_status ON media_items(album_id, publication_status, created_at);
CREATE INDEX idx_media_items_temple_type_status ON media_items(temple_id, media_type, publication_status);

CREATE TABLE darshan_photos (
  id TEXT PRIMARY KEY,
  darshan_event_id TEXT NOT NULL REFERENCES darshan_events(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  media_item_id TEXT NOT NULL UNIQUE REFERENCES media_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  display_order INTEGER NOT NULL CHECK (display_order > 0),
  alt_bn TEXT NOT NULL,
  alt_en TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0,1)),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','APPROVED','PUBLISHED','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_darshan_photos_event_order ON darshan_photos(darshan_event_id, display_order, status);

CREATE TABLE media_derivatives (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL REFERENCES media_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
  derivative_kind TEXT NOT NULL,
  object_provider TEXT NOT NULL DEFAULT 'B2' CHECK (object_provider = 'B2'),
  bucket_name TEXT NOT NULL,
  object_key TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL CHECK (byte_size >= 0),
  checksum_sha256 TEXT,
  width INTEGER,
  height INTEGER,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('PENDING','ACTIVE','FAILED','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (bucket_name, object_key),
  UNIQUE (media_item_id, derivative_kind)
);
CREATE INDEX idx_media_derivatives_media_status ON media_derivatives(media_item_id, status);

CREATE TABLE media_rights (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL UNIQUE REFERENCES media_items(id) ON UPDATE CASCADE ON DELETE CASCADE,
  rights_type TEXT NOT NULL CHECK (rights_type IN ('TEMPLE_OWNED','LICENSED','PERMISSIONED','UNKNOWN','RESTRICTED')),
  holder_name TEXT,
  license_reference TEXT,
  attribution_bn TEXT,
  attribution_en TEXT,
  usage_scope TEXT,
  expires_at TEXT,
  approval_required INTEGER NOT NULL DEFAULT 1 CHECK (approval_required IN (0,1)),
  rights_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (rights_status IN ('PENDING','CLEARED','EXPIRED','REJECTED')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_media_rights_status ON media_rights(rights_status, expires_at);

CREATE TABLE live_streams (
  id TEXT PRIMARY KEY,
  darshan_event_id TEXT REFERENCES darshan_events(id) ON UPDATE CASCADE ON DELETE SET NULL,
  title_bn TEXT NOT NULL,
  title_en TEXT,
  platform TEXT NOT NULL,
  stream_reference TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SCHEDULED','LIVE','ENDED','CANCELLED','ARCHIVED')),
  visibility TEXT NOT NULL DEFAULT 'PRIVATE' CHECK (visibility IN ('PRIVATE','PUBLIC')),
  scheduled_start_at TEXT,
  scheduled_end_at TEXT,
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_live_streams_status_schedule ON live_streams(status, scheduled_start_at);

CREATE TABLE videos (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL UNIQUE REFERENCES media_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  duration_ms INTEGER,
  width INTEGER,
  height INTEGER,
  poster_media_item_id TEXT,
  transcript_bn TEXT,
  transcript_en TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED')),
  rights_cleared INTEGER NOT NULL DEFAULT 0 CHECK (rights_cleared IN (0,1)),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_videos_status ON videos(status, published_at);

CREATE TABLE audio_tracks (
  id TEXT PRIMARY KEY,
  media_item_id TEXT NOT NULL UNIQUE REFERENCES media_items(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  duration_ms INTEGER,
  language TEXT NOT NULL,
  transcript_bn TEXT,
  transcript_en TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED')),
  rights_cleared INTEGER NOT NULL DEFAULT 0 CHECK (rights_cleared IN (0,1)),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_audio_tracks_status ON audio_tracks(status, published_at);

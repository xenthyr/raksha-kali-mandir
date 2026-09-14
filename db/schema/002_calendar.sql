-- Batch 007 — canonical calendar / Panjika D1/SQLite schema
-- Calendar data is sourced from canonical Panjika artifacts; no generic calendar inference is encoded here.

PRAGMA foreign_keys = ON;

CREATE TABLE panjika_years (
  id TEXT PRIMARY KEY,
  bengali_year INTEGER NOT NULL UNIQUE,
  calendar_system TEXT NOT NULL,
  calculation_engine TEXT NOT NULL,
  calculation_method TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  timezone TEXT NOT NULL,
  location_id TEXT REFERENCES temple_locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
  operational_start TEXT NOT NULL,
  operational_end TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED','INVALID')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  evidence_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_ids_json)),
  verification_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(verification_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  generated_at TEXT,
  published_at TEXT,
  archived_at TEXT,
  content_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (operational_end >= operational_start)
);
CREATE INDEX idx_panjika_years_status ON panjika_years(bengali_year, status);

CREATE TABLE tithis (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  paksha TEXT NOT NULL CHECK (paksha IN ('SHUKLA','KRISHNA','NONE','UNKNOWN')),
  sequence_number INTEGER NOT NULL CHECK (sequence_number BETWEEN 1 AND 15),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_tithis_paksha_sequence ON tithis(paksha, sequence_number, status);

CREATE TABLE panjika_days (
  id TEXT PRIMARY KEY,
  panjika_year_id TEXT NOT NULL REFERENCES panjika_years(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  day_number INTEGER NOT NULL CHECK (day_number > 0),
  bengali_year INTEGER NOT NULL,
  bengali_month INTEGER NOT NULL CHECK (bengali_month BETWEEN 1 AND 12),
  bengali_day INTEGER NOT NULL CHECK (bengali_day BETWEEN 1 AND 32),
  bengali_month_name_bn TEXT,
  bengali_month_name_en TEXT,
  gregorian_date TEXT NOT NULL,
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  paksha TEXT NOT NULL CHECK (paksha IN ('SHUKLA','KRISHNA','NONE','UNKNOWN')),
  tithi_id TEXT REFERENCES tithis(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tithi_start TEXT NOT NULL,
  tithi_end TEXT NOT NULL,
  nakshatra_id TEXT,
  nakshatra_start TEXT NOT NULL,
  nakshatra_end TEXT NOT NULL,
  sunrise TEXT,
  sunset TEXT,
  location_id TEXT REFERENCES temple_locations(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  calendar_system TEXT NOT NULL,
  calculation_engine TEXT NOT NULL,
  calculation_method TEXT NOT NULL,
  calculation_version TEXT NOT NULL,
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  evidence_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(evidence_ids_json)),
  verification_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(verification_ids_json)),
  calculation_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (calculation_status IN ('UNVERIFIED','PENDING','VERIFIED','CANONICAL_REGIONAL_CALCULATION','REJECTED')),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED','INVALID')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (panjika_year_id, gregorian_date),
  UNIQUE (panjika_year_id, day_number)
);
CREATE INDEX idx_panjika_days_date_status ON panjika_days(gregorian_date, status);
CREATE INDEX idx_panjika_days_amavasya_scan ON panjika_days(bengali_year, paksha, tithi_id, gregorian_date);

CREATE TABLE tithi_occurrences (
  id TEXT PRIMARY KEY,
  panjika_day_id TEXT NOT NULL REFERENCES panjika_days(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  tithi_id TEXT NOT NULL REFERENCES tithis(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  paksha TEXT NOT NULL CHECK (paksha IN ('SHUKLA','KRISHNA')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','INVALID')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  calculation_version TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at >= start_at)
);
CREATE INDEX idx_tithi_occurrences_day_time ON tithi_occurrences(panjika_day_id, start_at, end_at, status);

CREATE TABLE nakshatra_occurrences (
  id TEXT PRIMARY KEY,
  panjika_day_id TEXT NOT NULL REFERENCES panjika_days(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  nakshatra_id TEXT NOT NULL,
  start_at TEXT NOT NULL,
  end_at TEXT NOT NULL,
  timezone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED','INVALID')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  calculation_version TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (end_at >= start_at)
);
CREATE INDEX idx_nakshatra_occurrences_day_time ON nakshatra_occurrences(panjika_day_id, start_at, end_at, status);

CREATE TABLE amavasyas (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  display_name_bn TEXT NOT NULL,
  display_name_en TEXT NOT NULL,
  bengali_year INTEGER NOT NULL,
  bengali_month TEXT NOT NULL,
  gregorian_date TEXT NOT NULL,
  tithi_start TEXT NOT NULL,
  tithi_end TEXT NOT NULL,
  timezone TEXT NOT NULL,
  paksha TEXT NOT NULL CHECK (paksha = 'KRISHNA'),
  significance_bn TEXT,
  significance_en TEXT,
  special_puja_id TEXT,
  temple_observance_id TEXT,
  schedule_id TEXT,
  sankalp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sankalp_enabled IN (0,1)),
  annadanam_enabled INTEGER NOT NULL DEFAULT 0 CHECK (annadanam_enabled IN (0,1)),
  livestream_id TEXT,
  notice_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(notice_ids_json)),
  traffic_notice_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(traffic_notice_ids_json)),
  darshan_album_id TEXT,
  video_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(video_ids_json)),
  audio_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(audio_ids_json)),
  social_card_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(social_card_ids_json)),
  notification_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(notification_ids_json)),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  verified_by TEXT,
  verified_at TEXT,
  calculation_version TEXT NOT NULL,
  content_version TEXT NOT NULL,
  published_at TEXT,
  archived_at TEXT,
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED','INVALID')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (bengali_year, gregorian_date),
  CHECK (tithi_end >= tithi_start)
);
CREATE INDEX idx_amavasyas_date_status ON amavasyas(gregorian_date, status);
CREATE INDEX idx_amavasyas_year_month ON amavasyas(bengali_year, bengali_month, status);

CREATE TABLE festivals (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_festivals_slug_status ON festivals(slug, status);

CREATE TABLE festival_editions (
  id TEXT PRIMARY KEY,
  festival_id TEXT NOT NULL REFERENCES festivals(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  bengali_year INTEGER NOT NULL,
  gregorian_start TEXT,
  gregorian_end TEXT,
  display_name_bn TEXT,
  display_name_en TEXT,
  significance_bn TEXT,
  significance_en TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','IN_REVIEW','APPROVED','PUBLISHED','ARCHIVED','INVALID')),
  source_ids_json TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(source_ids_json)),
  calculation_version TEXT,
  content_version TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  published_at TEXT,
  archived_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (festival_id, bengali_year),
  CHECK (gregorian_end IS NULL OR gregorian_start IS NULL OR gregorian_end >= gregorian_start)
);
CREATE INDEX idx_festival_editions_year_status ON festival_editions(bengali_year, status);

CREATE TABLE temple_observances (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  panjika_day_id TEXT REFERENCES panjika_days(id) ON UPDATE CASCADE ON DELETE SET NULL,
  amavasya_id TEXT REFERENCES amavasyas(id) ON UPDATE CASCADE ON DELETE SET NULL,
  observance_type TEXT NOT NULL,
  date TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  significance_bn TEXT,
  significance_en TEXT,
  fixed_daily_puja_policy TEXT,
  special_puja_enabled INTEGER NOT NULL DEFAULT 0 CHECK (special_puja_enabled IN (0,1)),
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
CREATE INDEX idx_temple_observances_date_status ON temple_observances(date, status);
CREATE INDEX idx_temple_observances_amavasya ON temple_observances(amavasya_id, status);

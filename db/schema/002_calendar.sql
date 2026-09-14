-- Batch 007 / 002_calendar.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- Canonical 1433 Panjika relational schema. Astronomical values are supplied by source data;
-- this schema stores them and does not recalculate them from temple GPS.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS panjika_years (
    id TEXT PRIMARY KEY,
    bengali_year INTEGER NOT NULL,
    calendar_system TEXT NOT NULL,
    calculation_version TEXT NOT NULL,
    calculation_basis TEXT NOT NULL,
    operational_start TEXT NOT NULL,
    operational_end TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    CHECK (operational_end >= operational_start),
    UNIQUE (bengali_year, calculation_version)
);

CREATE TABLE IF NOT EXISTS tithis (
    id TEXT PRIMARY KEY,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT,
    paksha TEXT NOT NULL
        CHECK (paksha IN ('SHUKLA', 'KRISHNA')),
    sequence_number INTEGER CHECK (sequence_number BETWEEN 1 AND 15),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS panjika_days (
    id TEXT PRIMARY KEY,
    panjika_year_id TEXT NOT NULL,
    gregorian_date TEXT NOT NULL,
    bengali_year INTEGER NOT NULL,
    bengali_month INTEGER,
    bengali_month_name_bn TEXT,
    bengali_month_name_en TEXT,
    day_sequence INTEGER NOT NULL CHECK (day_sequence > 0),
    day_boundary_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    calculation_status TEXT NOT NULL DEFAULT 'UNVERIFIED'
        CHECK (calculation_status IN (
            'UNVERIFIED',
            'CANONICAL_REGIONAL_CALCULATION',
            'VERIFIED',
            'HISTORICAL',
            'REVIEW_REQUIRED'
        )),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    calculation_version TEXT NOT NULL,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (panjika_year_id) REFERENCES panjika_years(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (panjika_year_id, gregorian_date),
    UNIQUE (panjika_year_id, day_sequence)
);

CREATE TABLE IF NOT EXISTS tithi_occurrences (
    id TEXT PRIMARY KEY,
    panjika_day_id TEXT NOT NULL,
    tithi_id TEXT NOT NULL,
    start_at TEXT,
    end_at TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    occurrence_status TEXT NOT NULL DEFAULT 'CANONICAL'
        CHECK (occurrence_status IN ('CANONICAL', 'VERIFIED', 'HISTORICAL', 'REVIEW_REQUIRED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panjika_day_id) REFERENCES panjika_days(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (tithi_id) REFERENCES tithis(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE TABLE IF NOT EXISTS nakshatra_occurrences (
    id TEXT PRIMARY KEY,
    panjika_day_id TEXT NOT NULL,
    nakshatra_code TEXT NOT NULL,
    nakshatra_name_bn TEXT,
    nakshatra_name_en TEXT,
    start_at TEXT,
    end_at TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    occurrence_status TEXT NOT NULL DEFAULT 'CANONICAL'
        CHECK (occurrence_status IN ('CANONICAL', 'VERIFIED', 'HISTORICAL', 'REVIEW_REQUIRED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panjika_day_id) REFERENCES panjika_days(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

CREATE TABLE IF NOT EXISTS amavasyas (
    id TEXT PRIMARY KEY,
    panjika_day_id TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT,
    bengali_year INTEGER NOT NULL,
    bengali_month TEXT,
    gregorian_date TEXT NOT NULL,
    tithi_start TEXT,
    tithi_end TEXT,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    paksha TEXT NOT NULL DEFAULT 'KRISHNA'
        CHECK (paksha = 'KRISHNA'),
    significance_bn TEXT,
    significance_en TEXT,
    special_puja_id TEXT,
    temple_observance_id TEXT,
    schedule_id TEXT,
    sankalp_enabled INTEGER NOT NULL DEFAULT 0 CHECK (sankalp_enabled IN (0, 1)),
    annadanam_enabled INTEGER NOT NULL DEFAULT 0 CHECK (annadanam_enabled IN (0, 1)),
    livestream_id TEXT,
    notice_ids_json TEXT,
    traffic_notice_ids_json TEXT,
    darshan_album_id TEXT,
    video_ids_json TEXT,
    audio_ids_json TEXT,
    social_card_ids_json TEXT,
    notification_ids_json TEXT,
    source_ids_json TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    calculation_version TEXT NOT NULL,
    content_version INTEGER NOT NULL DEFAULT 1 CHECK (content_version >= 1),
    published_at TEXT,
    archived_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (panjika_day_id) REFERENCES panjika_days(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_amavasya_date_status
    ON amavasyas (gregorian_date, status);
CREATE INDEX IF NOT EXISTS idx_amavasya_year_month_status
    ON amavasyas (bengali_year, bengali_month, status);
CREATE INDEX IF NOT EXISTS idx_panjika_days_date_status
    ON panjika_days (gregorian_date, calculation_status);
CREATE INDEX IF NOT EXISTS idx_panjika_days_year_seq
    ON panjika_days (panjika_year_id, day_sequence);
CREATE INDEX IF NOT EXISTS idx_tithi_occurrences_day
    ON tithi_occurrences (panjika_day_id);
CREATE INDEX IF NOT EXISTS idx_nakshatra_occurrences_day
    ON nakshatra_occurrences (panjika_day_id);

CREATE TABLE IF NOT EXISTS festivals (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    recurring INTEGER NOT NULL DEFAULT 0 CHECK (recurring IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS festival_editions (
    id TEXT PRIMARY KEY,
    festival_id TEXT NOT NULL,
    bengali_year INTEGER NOT NULL,
    date_start TEXT,
    date_end TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    temple_observance_id TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (festival_id) REFERENCES festivals(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (date_end IS NULL OR date_start IS NULL OR date_end >= date_start),
    UNIQUE (festival_id, bengali_year)
);

CREATE TABLE IF NOT EXISTS temple_observances (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    observance_type TEXT NOT NULL
        CHECK (observance_type IN ('AMAVASYA', 'FESTIVAL', 'SPECIAL_PUJA', 'DARSHAN', 'OTHER')),
    canonical_event_id TEXT,
    observance_date TEXT NOT NULL,
    title_bn TEXT NOT NULL,
    title_en TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    fixed_daily_puja_policy TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_festivals_status_slug
    ON festivals (status, slug);
CREATE INDEX IF NOT EXISTS idx_festival_editions_year_status
    ON festival_editions (bengali_year, status);
CREATE INDEX IF NOT EXISTS idx_observances_temple_date_status
    ON temple_observances (temple_id, observance_date, status);

-- Batch 007 / 001_core.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- D1/SQLite foundational relational schema.
-- Canonical source IDs are stored as opaque TEXT identifiers; display labels never define identity.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS temples (
    id TEXT PRIMARY KEY,
    name_bn TEXT NOT NULL,
    name_en TEXT NOT NULL,
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
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS temple_locations (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    address_bn TEXT NOT NULL,
    address_en TEXT,
    latitude REAL NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
    longitude REAL NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
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
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (temple_id, latitude, longitude)
);

CREATE TABLE IF NOT EXISTS temple_facilities (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    name_en TEXT,
    description_bn TEXT,
    description_en TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'DRAFT', 'ARCHIVED')),
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

CREATE TABLE IF NOT EXISTS temple_contacts (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    contact_type TEXT NOT NULL
        CHECK (contact_type IN ('PHONE', 'EMAIL', 'WHATSAPP', 'WEB', 'OTHER')),
    contact_value TEXT NOT NULL,
    visibility TEXT NOT NULL DEFAULT 'PRIVATE_ADMIN'
        CHECK (visibility IN ('PUBLIC', 'PRIVATE_ADMIN', 'APPROVAL_REQUIRED')),
    public_approved_at TEXT,
    public_approved_by TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (temple_id, contact_type, contact_value)
);

CREATE TABLE IF NOT EXISTS committees (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    name_en TEXT,
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
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS committee_terms (
    id TEXT PRIMARY KEY,
    committee_id TEXT NOT NULL,
    name_bn TEXT,
    name_en TEXT,
    starts_on TEXT NOT NULL,
    ends_on TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    FOREIGN KEY (committee_id) REFERENCES committees(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (ends_on IS NULL OR ends_on >= starts_on)
);

CREATE TABLE IF NOT EXISTS persons (
    id TEXT PRIMARY KEY,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    is_founder INTEGER NOT NULL DEFAULT 0 CHECK (is_founder IN (0, 1)),
    public_contact TEXT NOT NULL DEFAULT 'NONE'
        CHECK (public_contact IN ('NONE', 'PHONE', 'EMAIL', 'WHATSAPP', 'CONTACT_FORM')),
    contact_visibility TEXT NOT NULL DEFAULT 'PRIVATE_ADMIN'
        CHECK (contact_visibility IN ('PUBLIC', 'PRIVATE_ADMIN', 'APPROVAL_REQUIRED')),
    phone_private TEXT,
    email_private TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS committee_roles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    name_en TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT,
    UNIQUE (code)
);

CREATE TABLE IF NOT EXISTS committee_role_orders (
    id TEXT PRIMARY KEY,
    role_id TEXT NOT NULL,
    display_order INTEGER NOT NULL CHECK (display_order > 0),
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES committee_roles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (effective_to IS NULL OR effective_to >= effective_from),
    UNIQUE (role_id, effective_from),
    UNIQUE (display_order, effective_from)
);

CREATE TABLE IF NOT EXISTS committee_role_assignments (
    p_role_id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    committee_term_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'CLOSED')),
    valid_from TEXT NOT NULL,
    valid_to TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (person_id) REFERENCES persons(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (role_id) REFERENCES committee_roles(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (committee_term_id) REFERENCES committee_terms(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE TABLE IF NOT EXISTS priests (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT,
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
    FOREIGN KEY (temple_id) REFERENCES temples(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS sevaks (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    display_name_bn TEXT NOT NULL,
    display_name_en TEXT,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
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

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    phone_normalized TEXT UNIQUE,
    password_hash TEXT NOT NULL,
    password_kdf_version TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'DISABLED', 'LOCKED', 'INVITED', 'REVOKED')),
    first_login_required INTEGER NOT NULL DEFAULT 0 CHECK (first_login_required IN (0, 1)),
    recovery_email_private TEXT,
    last_login_at TEXT,
    disabled_at TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_roles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_bn TEXT NOT NULL,
    name_en TEXT,
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

CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name_bn TEXT,
    name_en TEXT,
    resource TEXT,
    action TEXT,
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

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id TEXT NOT NULL,
    permission_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'REVOKED')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES auth_roles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id)
        ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'REVOKED', 'HISTORICAL')),
    valid_from TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    valid_to TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    FOREIGN KEY (role_id) REFERENCES auth_roles(id)
        ON UPDATE CASCADE ON DELETE CASCADE,
    CHECK (valid_to IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_temple_locations_temple_status
    ON temple_locations (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_facilities_temple_status
    ON temple_facilities (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_contacts_temple_visibility
    ON temple_contacts (temple_id, visibility, status);
CREATE INDEX IF NOT EXISTS idx_committees_temple_status
    ON committees (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_terms_committee_status_dates
    ON committee_terms (committee_id, status, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_assignments_person_status
    ON committee_role_assignments (person_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_role_status
    ON committee_role_assignments (role_id, status);
CREATE INDEX IF NOT EXISTS idx_assignments_term_status
    ON committee_role_assignments (committee_term_id, status);
CREATE INDEX IF NOT EXISTS idx_role_orders_role_status
    ON committee_role_orders (role_id, status, effective_from);
CREATE INDEX IF NOT EXISTS idx_priests_temple_status
    ON priests (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_sevaks_temple_status
    ON sevaks (temple_id, status);
CREATE INDEX IF NOT EXISTS idx_users_status
    ON users (status);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_status
    ON user_roles (role_id, status);

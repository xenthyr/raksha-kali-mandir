-- Batch 007 — core canonical D1/SQLite schema
-- Contract families: CTR-05101–CTR-05200, CTR-06401–CTR-06500, CTR-05701–CTR-05800
-- No seed data belongs in this migration. Canonical records are supplied by later seed batches.

PRAGMA foreign_keys = ON;

CREATE TABLE temples (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE temple_locations (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  label_bn TEXT,
  label_en TEXT,
  latitude REAL NOT NULL CHECK (latitude BETWEEN -90.0 AND 90.0),
  longitude REAL NOT NULL CHECK (longitude BETWEEN -180.0 AND 180.0),
  timezone TEXT NOT NULL,
  address_bn TEXT,
  address_en TEXT,
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (temple_id, id)
);
CREATE UNIQUE INDEX uq_temple_locations_primary ON temple_locations(temple_id) WHERE is_primary = 1 AND status = 'ACTIVE';
CREATE INDEX idx_temple_locations_temple_status ON temple_locations(temple_id, status);

CREATE TABLE temple_facilities (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  slug TEXT NOT NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description_bn TEXT,
  description_en TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (temple_id, slug)
);
CREATE INDEX idx_temple_facilities_temple_status ON temple_facilities(temple_id, status);

CREATE TABLE temple_contacts (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('PHONE','EMAIL','ADDRESS','WEBSITE','CONTACT_FORM','SOCIAL')),
  label_bn TEXT,
  label_en TEXT,
  value_private TEXT,
  value_public TEXT,
  visibility TEXT NOT NULL DEFAULT 'PRIVATE_ADMIN' CHECK (visibility IN ('PUBLIC','PRIVATE_ADMIN','NONE')),
  is_primary INTEGER NOT NULL DEFAULT 0 CHECK (is_primary IN (0,1)),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_temple_contacts_public ON temple_contacts(temple_id, visibility, status);
CREATE INDEX idx_temple_contacts_type ON temple_contacts(temple_id, contact_type, status);

CREATE TABLE committees (
  id TEXT PRIMARY KEY,
  temple_id TEXT NOT NULL REFERENCES temples(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_committees_temple_status ON committees(temple_id, status);

CREATE TABLE committee_terms (
  id TEXT PRIMARY KEY,
  committee_id TEXT NOT NULL REFERENCES committees(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  term_label_bn TEXT NOT NULL,
  term_label_en TEXT,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','CLOSED','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_committee_terms_committee_dates ON committee_terms(committee_id, valid_from, valid_to, status);

CREATE TABLE persons (
  id TEXT PRIMARY KEY,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  phone_private TEXT,
  email_private TEXT,
  notes_private TEXT,
  public_contact_approved INTEGER NOT NULL DEFAULT 0 CHECK (public_contact_approved IN (0,1)),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE committee_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  is_vacant_allowed INTEGER NOT NULL DEFAULT 1 CHECK (is_vacant_allowed IN (0,1)),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE committee_role_orders (
  id TEXT PRIMARY KEY,
  role_id TEXT NOT NULL REFERENCES committee_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  display_order INTEGER NOT NULL CHECK (display_order > 0),
  effective_from TEXT NOT NULL,
  effective_to TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','CLOSED','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  updated_at TEXT NOT NULL,
  CHECK (effective_to IS NULL OR effective_to >= effective_from),
  UNIQUE (role_id, effective_from)
);
CREATE INDEX idx_committee_role_orders_display ON committee_role_orders(display_order, effective_from, effective_to, status);

CREATE TABLE committee_role_assignments (
  p_role_id TEXT PRIMARY KEY,
  person_id TEXT NOT NULL REFERENCES persons(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  role_id TEXT NOT NULL REFERENCES committee_roles(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  committee_term_id TEXT NOT NULL REFERENCES committee_terms(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','CLOSED','VOID','ARCHIVED')),
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_role_assignments_term_role ON committee_role_assignments(committee_term_id, role_id, status);
CREATE INDEX idx_role_assignments_person ON committee_role_assignments(person_id, status);
CREATE UNIQUE INDEX uq_active_person_role_assignment ON committee_role_assignments(person_id, role_id, committee_term_id) WHERE status IN ('DRAFT','ACTIVE');
CREATE UNIQUE INDEX uq_active_term_role_slot ON committee_role_assignments(role_id, committee_term_id) WHERE status = 'ACTIVE';

CREATE TABLE priests (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  temple_id TEXT REFERENCES temples(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_priests_temple_status ON priests(temple_id, status);

CREATE TABLE sevaks (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id) ON UPDATE CASCADE ON DELETE SET NULL,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  temple_id TEXT REFERENCES temples(id) ON UPDATE CASCADE ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  source_id TEXT,
  verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED' CHECK (verification_status IN ('UNVERIFIED','PENDING','VERIFIED','REJECTED')),
  revision_id TEXT,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX idx_sevaks_temple_status ON sevaks(temple_id, status);

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  person_id TEXT REFERENCES persons(id) ON UPDATE CASCADE ON DELETE SET NULL,
  username TEXT UNIQUE,
  email_private TEXT,
  phone_normalized TEXT,
  password_hash TEXT,
  mfa_secret_encrypted TEXT,
  recovery_email_private TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','LOCKED','DISABLED','INVITED','ARCHIVED')),
  auth_provider TEXT NOT NULL DEFAULT 'INTERNAL' CHECK (auth_provider IN ('INTERNAL','OIDC','OTHER')),
  last_login_at TEXT,
  failed_login_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_login_count >= 0),
  locked_until TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);
CREATE INDEX idx_users_status ON users(status, updated_at);

CREATE TABLE auth_roles (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name_bn TEXT NOT NULL,
  name_en TEXT,
  description_bn TEXT,
  description_en TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE permissions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','INACTIVE','ARCHIVED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE role_permissions (
  role_id TEXT NOT NULL REFERENCES auth_roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  permission_id TEXT NOT NULL REFERENCES permissions(id) ON UPDATE CASCADE ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions(permission_id, role_id);

CREATE TABLE user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES auth_roles(id) ON UPDATE CASCADE ON DELETE CASCADE,
  valid_from TEXT NOT NULL,
  valid_to TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REVOKED','EXPIRED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CHECK (valid_to IS NULL OR valid_to >= valid_from)
);
CREATE INDEX idx_user_roles_status ON user_roles(role_id, status, valid_from, valid_to);

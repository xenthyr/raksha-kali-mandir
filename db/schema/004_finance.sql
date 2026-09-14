-- Batch 008 / 004_finance.sql
-- Sri Sri Maa Raksha Kali Mandir V1.1.3
-- D1/SQLite finance, donation, receipt, ledger and reporting schema.
-- Monetary values are stored as integer paise; public serializers must not expose private finance fields.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS donation_configs (
    id TEXT PRIMARY KEY,
    official_upi_vpa TEXT NOT NULL,
    payee_name TEXT NOT NULL,
    transaction_note TEXT NOT NULL,
    minimum_amount_paise INTEGER NOT NULL CHECK (minimum_amount_paise > 0),
    suggested_amounts_json TEXT NOT NULL,
    methods_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (status IN ('CURRENT', 'HISTORICAL', 'DRAFT', 'ARCHIVED')),
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    verified_by TEXT,
    verified_at TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE TABLE IF NOT EXISTS donations (
    id TEXT PRIMARY KEY,
    temple_id TEXT NOT NULL,
    config_id TEXT NOT NULL,
    public_reference TEXT NOT NULL UNIQUE,
    donor_name_private TEXT,
    donor_email_private TEXT,
    donor_phone_private TEXT,
    purpose_code TEXT NOT NULL,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    method TEXT NOT NULL CHECK (method IN ('UPI', 'CASH')),
    status TEXT NOT NULL DEFAULT 'CREATED'
        CHECK (status IN (
            'CREATED', 'UPI_INITIATED', 'UTR_SUBMITTED', 'PENDING_VERIFICATION',
            'VERIFIED', 'REJECTED', 'REFUNDED', 'RECEIPT_ISSUED', 'LEDGER_POSTED'
        )),
    current_attempt_id TEXT,
    verified_amount_paise INTEGER CHECK (verified_amount_paise IS NULL OR verified_amount_paise > 0),
    private_note TEXT,
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
    FOREIGN KEY (config_id) REFERENCES donation_configs(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS donation_attempts (
    id TEXT PRIMARY KEY,
    donation_id TEXT NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('UPI', 'CASH')),
    status TEXT NOT NULL DEFAULT 'INITIATED'
        CHECK (status IN ('INITIATED', 'ABANDONED', 'UTR_SUBMITTED', 'PENDING_VERIFICATION', 'COMPLETED', 'FAILED')),
    client_idempotency_key TEXT NOT NULL UNIQUE,
    provider_reference_private TEXT,
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    initiated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    failure_code TEXT,
    failure_detail_private TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS donation_verifications (
    id TEXT PRIMARY KEY,
    donation_id TEXT NOT NULL,
    verification_reference TEXT NOT NULL UNIQUE,
    utr_private TEXT,
    utr_normalized_private TEXT UNIQUE,
    submitted_amount_paise INTEGER CHECK (submitted_amount_paise IS NULL OR submitted_amount_paise > 0),
    status TEXT NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING', 'VERIFIED', 'REJECTED', 'DUPLICATE_REVIEW', 'MISMATCH_REVIEW')),
    duplicate_flag INTEGER NOT NULL DEFAULT 0 CHECK (duplicate_flag IN (0, 1)),
    amount_mismatch_flag INTEGER NOT NULL DEFAULT 0 CHECK (amount_mismatch_flag IN (0, 1)),
    verifier_user_id TEXT,
    decision_reason_private TEXT,
    evidence_reference_private TEXT,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (verifier_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    CHECK (reviewed_at IS NULL OR reviewed_at >= submitted_at),
    CHECK ((duplicate_flag = 0) OR (status = 'DUPLICATE_REVIEW')),
    CHECK ((amount_mismatch_flag = 0) OR (status = 'MISMATCH_REVIEW'))
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    donation_id TEXT NOT NULL UNIQUE,
    receipt_number TEXT NOT NULL UNIQUE,
    receipt_series TEXT NOT NULL DEFAULT 'STANDARD',
    receipt_year INTEGER NOT NULL CHECK (receipt_year >= 2000),
    sequence_number INTEGER NOT NULL CHECK (sequence_number > 0),
    issued_amount_paise INTEGER NOT NULL CHECK (issued_amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'ISSUED'
        CHECK (status IN ('ISSUED', 'REVOKED', 'CORRECTED')),
    issued_by_user_id TEXT NOT NULL,
    issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TEXT,
    correction_of_receipt_id TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'VERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (issued_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (correction_of_receipt_id) REFERENCES receipts(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    UNIQUE (receipt_series, receipt_year, sequence_number),
    CHECK ((status = 'REVOKED' AND revoked_at IS NOT NULL) OR status <> 'REVOKED')
);

CREATE TABLE IF NOT EXISTS financial_periods (
    id TEXT PRIMARY KEY,
    period_code TEXT NOT NULL UNIQUE,
    starts_on TEXT NOT NULL,
    ends_on TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN'
        CHECK (status IN ('OPEN', 'CLOSED', 'LOCKED', 'ARCHIVED')),
    closed_by_user_id TEXT,
    closed_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (ends_on >= starts_on),
    CHECK ((status IN ('OPEN', 'ARCHIVED')) OR closed_at IS NOT NULL),
    FOREIGN KEY (closed_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS finance_transactions (
    id TEXT PRIMARY KEY,
    financial_period_id TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('INCOME', 'EXPENSE', 'TRANSFER', 'ADJUSTMENT', 'REFUND')),
    amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),
    currency TEXT NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'PENDING_VERIFICATION', 'VERIFIED', 'APPROVED', 'POSTED', 'REVERSED', 'REJECTED')),
    reference_type TEXT,
    reference_id TEXT,
    description_private TEXT,
    entered_by_user_id TEXT NOT NULL,
    verified_by_user_id TEXT,
    approved_by_user_id TEXT,
    posted_at TEXT,
    reversed_at TEXT,
    source_id TEXT,
    verification_status TEXT NOT NULL DEFAULT 'UNVERIFIED',
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (financial_period_id) REFERENCES financial_periods(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (entered_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (verified_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS income_entries (
    id TEXT PRIMARY KEY,
    finance_transaction_id TEXT NOT NULL UNIQUE,
    category_code TEXT NOT NULL,
    source_description TEXT,
    donation_id TEXT,
    receipt_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'VERIFIED', 'APPROVED', 'POSTED', 'REVERSED')),
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (finance_transaction_id) REFERENCES finance_transactions(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (donation_id) REFERENCES donations(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (receipt_id) REFERENCES receipts(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS expense_entries (
    id TEXT PRIMARY KEY,
    finance_transaction_id TEXT NOT NULL UNIQUE,
    category_code TEXT NOT NULL,
    vendor_name_private TEXT,
    description_private TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'VERIFIED', 'APPROVED', 'POSTED', 'REVERSED')),
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (finance_transaction_id) REFERENCES finance_transactions(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS monthly_reports (
    id TEXT PRIMARY KEY,
    financial_period_id TEXT NOT NULL UNIQUE,
    report_code TEXT NOT NULL UNIQUE,
    report_year INTEGER NOT NULL CHECK (report_year >= 2000),
    report_month INTEGER NOT NULL CHECK (report_month BETWEEN 1 AND 12),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    income_total_paise INTEGER NOT NULL DEFAULT 0 CHECK (income_total_paise >= 0),
    expense_total_paise INTEGER NOT NULL DEFAULT 0 CHECK (expense_total_paise >= 0),
    net_total_paise INTEGER NOT NULL DEFAULT 0,
    snapshot_hash TEXT,
    prepared_by_user_id TEXT,
    approved_by_user_id TEXT,
    published_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (financial_period_id) REFERENCES financial_periods(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (prepared_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS annual_reports (
    id TEXT PRIMARY KEY,
    report_code TEXT NOT NULL UNIQUE,
    report_year INTEGER NOT NULL UNIQUE CHECK (report_year >= 2000),
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED')),
    income_total_paise INTEGER NOT NULL DEFAULT 0 CHECK (income_total_paise >= 0),
    expense_total_paise INTEGER NOT NULL DEFAULT 0 CHECK (expense_total_paise >= 0),
    net_total_paise INTEGER NOT NULL DEFAULT 0,
    monthly_report_ids_json TEXT NOT NULL,
    snapshot_hash TEXT,
    prepared_by_user_id TEXT,
    approved_by_user_id TEXT,
    published_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prepared_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS audit_reports (
    id TEXT PRIMARY KEY,
    report_code TEXT NOT NULL UNIQUE,
    scope_type TEXT NOT NULL CHECK (scope_type IN ('DONATION', 'RECEIPT', 'FINANCE', 'PERIOD', 'MONTHLY', 'ANNUAL', 'FULL')),
    scope_id TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT', 'IN_REVIEW', 'FINAL', 'ARCHIVED')),
    findings_json TEXT NOT NULL DEFAULT '{}',
    report_hash TEXT,
    prepared_by_user_id TEXT,
    approved_by_user_id TEXT,
    finalized_at TEXT,
    source_id TEXT,
    revision_id TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (prepared_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (approved_by_user_id) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_donations_temple_status_created
    ON donations (temple_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_donations_status_created
    ON donations (status, created_at);
CREATE INDEX IF NOT EXISTS idx_donations_purpose_status
    ON donations (purpose_code, status);
CREATE INDEX IF NOT EXISTS idx_attempts_donation_status
    ON donation_attempts (donation_id, status);
CREATE INDEX IF NOT EXISTS idx_verifications_donation_status
    ON donation_verifications (donation_id, status);
CREATE INDEX IF NOT EXISTS idx_verifications_utr
    ON donation_verifications (utr_normalized_private);
CREATE INDEX IF NOT EXISTS idx_receipts_status_issued
    ON receipts (status, issued_at);
CREATE INDEX IF NOT EXISTS idx_financial_periods_status_dates
    ON financial_periods (status, starts_on, ends_on);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_period_status
    ON finance_transactions (financial_period_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_finance_transactions_reference
    ON finance_transactions (reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_income_entries_status
    ON income_entries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_expense_entries_status
    ON expense_entries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_monthly_reports_status_period
    ON monthly_reports (status, report_year, report_month);
CREATE INDEX IF NOT EXISTS idx_annual_reports_status_year
    ON annual_reports (status, report_year);
CREATE INDEX IF NOT EXISTS idx_audit_reports_scope
    ON audit_reports (scope_type, scope_id, status);

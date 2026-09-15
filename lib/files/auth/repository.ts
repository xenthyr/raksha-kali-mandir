import { hashOpaqueToken } from "./crypto";
import { normalizeLoginIdentifier } from "./normalize";
import type {
  AuthDatabase,
  AuthPermissionRecord,
  AuthRoleRecord,
  AuthUserRecord,
} from "./types";

function rowToUser(row: Record<string, unknown>): AuthUserRecord {
  return {
    id: String(row.id),
    personId: row.person_id == null ? null : String(row.person_id),
    username: row.username == null ? null : String(row.username),
    phoneNormalized: row.phone_normalized == null ? null : String(row.phone_normalized),
    passwordHash: row.password_hash == null ? null : String(row.password_hash),
    passwordKdfVersion: row.password_kdf_version == null ? null : String(row.password_kdf_version),
    mustChangePassword: Number(row.must_change_password) === 1,
    status: String(row.status) as AuthUserRecord["status"],
    failedLoginCount: Number(row.failed_login_count ?? 0),
    lockedUntil: row.locked_until == null ? null : String(row.locked_until),
  };
}

export async function findUserByLoginIdentifier(
  db: AuthDatabase,
  identifier: string,
): Promise<AuthUserRecord | null> {
  const normalized = normalizeLoginIdentifier(identifier);
  const query =
    normalized.kind === "phone"
      ? `SELECT id, person_id, username, phone_normalized, password_hash, password_kdf_version,
                must_change_password, status, failed_login_count, locked_until
         FROM users WHERE phone_normalized = ? AND deleted_at IS NULL LIMIT 1`
      : `SELECT id, person_id, username, phone_normalized, password_hash, password_kdf_version,
                must_change_password, status, failed_login_count, locked_until
         FROM users WHERE lower(trim(username)) = ? AND deleted_at IS NULL LIMIT 1`;
  const row = await db.prepare(query).bind(normalized.value).first<Record<string, unknown>>();
  return row ? rowToUser(row) : null;
}

export async function findUserById(db: AuthDatabase, userId: string): Promise<AuthUserRecord | null> {
  const row = await db
    .prepare(
      `SELECT id, person_id, username, phone_normalized, password_hash, password_kdf_version,
              must_change_password, status, failed_login_count, locked_until
       FROM users WHERE id = ? AND deleted_at IS NULL LIMIT 1`,
    )
    .bind(userId)
    .first<Record<string, unknown>>();
  return row ? rowToUser(row) : null;
}

export async function recordLoginFailure(
  db: AuthDatabase,
  userId: string,
  failedLoginCount: number,
  lockedUntil: string | null,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET failed_login_count = ?, locked_until = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(failedLoginCount, lockedUntil, userId)
    .run();
}

export async function recordLoginSuccess(db: AuthDatabase, userId: string): Promise<void> {
  await db
    .prepare(
      `UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = CURRENT_TIMESTAMP,
              updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    )
    .bind(userId)
    .run();
}

export async function setPassword(
  db: AuthDatabase,
  userId: string,
  passwordHash: string,
  kdfVersion: string,
  mustChangePassword: boolean,
): Promise<void> {
  await db
    .prepare(
      `UPDATE users
       SET password_hash = ?, password_kdf_version = ?, must_change_password = ?,
           password_changed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND deleted_at IS NULL`,
    )
    .bind(passwordHash, kdfVersion, mustChangePassword ? 1 : 0, userId)
    .run();
}

export async function getUserRoles(db: AuthDatabase, userId: string): Promise<AuthRoleRecord[]> {
  const result = await db
    .prepare(
      `SELECT ar.code, ur.valid_from, ur.valid_to, ur.status
       FROM user_roles ur
       JOIN auth_roles ar ON ar.id = ur.role_id
       WHERE ur.user_id = ? AND ur.status = 'ACTIVE' AND ar.status = 'ACTIVE'
         AND ur.valid_from <= CURRENT_TIMESTAMP
         AND (ur.valid_to IS NULL OR ur.valid_to >= CURRENT_TIMESTAMP)
       ORDER BY ar.code`,
    )
    .bind(userId)
    .all<Record<string, unknown>>();
  return result.results.map((row) => ({
    code: String(row.code),
    validFrom: String(row.valid_from),
    validTo: row.valid_to == null ? null : String(row.valid_to),
    status: String(row.status) as AuthRoleRecord["status"],
  }));
}

export async function getUserPermissions(db: AuthDatabase, userId: string): Promise<AuthPermissionRecord[]> {
  const result = await db
    .prepare(
      `SELECT DISTINCT p.code, p.resource, p.action
       FROM user_roles ur
       JOIN role_permissions rp ON rp.role_id = ur.role_id
       JOIN permissions p ON p.id = rp.permission_id
       JOIN auth_roles ar ON ar.id = ur.role_id
       WHERE ur.user_id = ? AND ur.status = 'ACTIVE' AND ar.status = 'ACTIVE' AND p.status = 'ACTIVE'
         AND ur.valid_from <= CURRENT_TIMESTAMP
         AND (ur.valid_to IS NULL OR ur.valid_to >= CURRENT_TIMESTAMP)
       ORDER BY p.code`,
    )
    .bind(userId)
    .all<Record<string, unknown>>();
  return result.results.map((row) => ({
    code: String(row.code),
    resource: String(row.resource),
    action: String(row.action),
  }));
}

export async function insertResetToken(
  db: AuthDatabase,
  userId: string,
  token: string,
  expiresAt: string,
  requestedIpHash: string | null,
  requestedUserAgentHash: string | null,
): Promise<string> {
  await db
    .prepare(
      `UPDATE auth_password_reset_tokens
       SET invalidated_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    )
    .bind(userId)
    .run();
  const id = crypto.randomUUID();
  const tokenHash = await hashOpaqueToken(token);
  await db
    .prepare(
      `INSERT INTO auth_password_reset_tokens
       (id, user_id, token_hash, expires_at, requested_ip_hash, requested_user_agent_hash)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(id, userId, tokenHash, expiresAt, requestedIpHash, requestedUserAgentHash)
    .run();
  return id;
}

export async function consumeResetToken(
  db: AuthDatabase,
  token: string,
): Promise<{ tokenId: string; userId: string } | null> {
  const tokenHash = await hashOpaqueToken(token);
  const row = await db
    .prepare(
      `SELECT id, user_id FROM auth_password_reset_tokens
       WHERE token_hash = ? AND consumed_at IS NULL AND invalidated_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
    )
    .bind(tokenHash)
    .first<{ id: string; user_id: string }>();
  if (!row) return null;
  const result = await db
    .prepare(
      `UPDATE auth_password_reset_tokens SET consumed_at = CURRENT_TIMESTAMP
       WHERE id = ? AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
    )
    .bind(row.id)
    .run();
  if ((result.meta?.changes ?? 0) !== 1) return null;
  return { tokenId: row.id, userId: row.user_id };
}

export async function revokeAllUserSessions(db: AuthDatabase, userId: string, reason: string): Promise<void> {
  await db
    .prepare(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP, revoke_reason = ?,
              last_seen_at = CURRENT_TIMESTAMP
       WHERE user_id = ? AND revoked_at IS NULL`,
    )
    .bind(reason, userId)
    .run();
}

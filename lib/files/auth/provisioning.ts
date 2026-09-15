import { assertPasswordPolicy, hashPassword, generateInitialPassword, PASSWORD_KDF_VERSION } from "./crypto";
import type { AuthDatabase } from "./types";

export interface AdminAccountProvisioningSpec {
  userId: string;
  personId: string;
  username: string;
  roleCodes: string[];
  phoneNormalized?: string | null;
  recoveryEmailPrivate?: string | null;
  password?: string;
  requireFirstLoginSetup?: boolean;
}

export interface CredentialHandoff {
  userId: string;
  personId: string;
  username: string;
  roleCodes: string[];
  initialPassword: string;
  mustChangePassword: true;
  passwordKdfVersion: typeof PASSWORD_KDF_VERSION;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

export async function provisionAdminAccount(
  db: AuthDatabase,
  spec: AdminAccountProvisioningSpec,
): Promise<CredentialHandoff> {
  const roles = uniqueStrings(spec.roleCodes);
  if (roles.length === 0) throw new Error("at_least_one_role_required");
  const initialPassword = spec.password ?? generateInitialPassword();
  const passwordHash = await hashPassword(initialPassword);
  if (spec.requireFirstLoginSetup === false) throw new Error("first_login_setup_required");
  assertPasswordPolicy(initialPassword);
  const mustChange = true;

  const existingPerson = await db
    .prepare(`SELECT id FROM persons WHERE id = ? AND status = 'ACTIVE' LIMIT 1`)
    .bind(spec.personId)
    .first<{ id: string }>();
  if (!existingPerson) throw new Error("canonical_person_not_found");

  const normalizedUsername = spec.username.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(normalizedUsername) || normalizedUsername.length > 120) {
    throw new Error("invalid_username");
  }
  const existingUser = await db
    .prepare(`SELECT id FROM users WHERE id = ? OR lower(trim(username)) = ? LIMIT 1`)
    .bind(spec.userId, normalizedUsername)
    .first<{ id: string }>();
  if (existingUser) throw new Error("user_or_username_conflict");

  const roleRows = await db
    .prepare(
      `SELECT code FROM auth_roles WHERE code IN (${roles.map(() => "?").join(",")}) AND status = 'ACTIVE'`,
    )
    .bind(...roles)
    .all<{ code: string }>();
  const validRoles = new Set(roleRows.results.map((row) => row.code));
  if (validRoles.size !== roles.length) throw new Error("unsupported_auth_role");

  const roleIds = await Promise.all(
    roles.map(async (roleCode) => {
      const role = await db.prepare(`SELECT id FROM auth_roles WHERE code = ? LIMIT 1`).bind(roleCode).first<{ id: string }>();
      if (!role) throw new Error("auth_role_not_found");
      return role.id;
    }),
  );

  const provisioningReference = `PROVISION-${crypto.randomUUID()}`;
  const statements = [
    db
      .prepare(
        `INSERT INTO users
         (id, person_id, username, email_private, phone_normalized, password_hash, recovery_email_private,
          status, auth_provider, last_login_at, failed_login_count, locked_until,
          created_at, updated_at, must_change_password, password_kdf_version,
          password_changed_at, credential_provisioned_at, credential_provisioning_reference)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'INTERNAL', NULL, 0, NULL,
                 CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, NULL, CURRENT_TIMESTAMP, ?)`,
      )
      .bind(
        spec.userId,
        spec.personId,
        normalizedUsername,
        spec.recoveryEmailPrivate ?? null,
        spec.phoneNormalized ?? null,
        passwordHash,
        spec.recoveryEmailPrivate ?? null,
        mustChange ? 1 : 0,
        PASSWORD_KDF_VERSION,
        provisioningReference,
      ),
    ...roleIds.map((roleId) =>
      db
        .prepare(
          `INSERT INTO user_roles (user_id, role_id, valid_from, valid_to, status)
           VALUES (?, ?, CURRENT_TIMESTAMP, NULL, 'ACTIVE')`,
        )
        .bind(spec.userId, roleId),
    ),
    db
      .prepare(
        `INSERT INTO auth_audit_events
         (id, subject_user_id, action, result, reason_code, metadata_json)
         VALUES (?, ?, 'ACCOUNT_PROVISIONED', 'SUCCESS', 'AUTHORIZED_PROVISIONING', ?)`,
      )
      .bind(crypto.randomUUID(), spec.userId, JSON.stringify({ roleCodes: roles })),
  ];

  await db.batch(statements);

  return {
    userId: spec.userId,
    personId: spec.personId,
    username: normalizedUsername,
    roleCodes: roles,
    initialPassword,
    mustChangePassword: true,
    passwordKdfVersion: PASSWORD_KDF_VERSION,
  };
}

export const CANONICAL_COMMITTEE_ACCOUNT_USERNAMES = {
  "PERSON-000001": "mithun.sarkar",
  "PERSON-000002": "sanjay.shil",
  "PERSON-000003": "bapi.bhowmick",
  "PERSON-000004": "tanmay.dutta",
  "PERSON-000005": "chinmoy.dutta",
  "PERSON-000006": "biplab.sarkar",
  "PERSON-000007": "mintu.shil",
  "PERSON-000008": "jayanta.dey.sarkar",
  "PERSON-000009": "chayan.sarkar",
} as const;

export const SUPER_ADMIN_USERNAME = "super.admin" as const;

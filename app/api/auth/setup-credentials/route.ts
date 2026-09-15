import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { assertPasswordPolicy, hashPassword, PASSWORD_KDF_VERSION } from "../../../../lib/files/auth/crypto";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserRoles } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEFAULT_SESSION_COOKIE_NAME = "raksha_kali_session";
const COOKIE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const REQUEST_ID_HEADER = "x-request-id";
const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে অ্যাকাউন্ট সেটআপ সম্পন্ন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const SESSION_INVALID_MESSAGE = "আপনার সেশনটি আর বৈধ নয়। আবার লগইন করুন।";

interface SetupInput {
  phone: string;
  newPassword: string;
  recoveryEmail?: string;
}

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
  SESSION_STORE?: AuthSessionStore;
  SESSION_COOKIE_NAME?: string;
}

interface SetupCanonicalRow {
  user_id: string;
  user_phone: string | null;
  person_phone: string | null;
  must_change_password: number;
  user_status: string;
}

function runtimeEnv(): AuthRuntimeEnv {
  return getCloudflareContext().env as unknown as AuthRuntimeEnv;
}

function requestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function parseCookie(request: Request, cookieName: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] || null;
}

function jsonHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function errorResponse(status: number, traceId: string, code: string, message: string): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message }, meta: { traceId } },
    { status, headers: jsonHeaders() },
  );
}

function normalizePhone(value: string): string {
  const compact = value.trim().replace(/[\s().-]/g, "");
  return compact.startsWith("+")
    ? `+${compact.slice(1).replace(/\D/g, "")}`
    : compact.replace(/\D/g, "");
}

function validPhone(value: string): boolean {
  return /^\+?[0-9]{10,15}$/.test(value);
}

function normalizeRecoveryEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validRecoveryEmail(value: string): boolean {
  return value.length >= 3 && value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function canonicalPhoneCandidates(value: string | null): string[] {
  if (!value) return [];
  const parts = value.split(/[;,|/\n]+/g).map((part) => normalizePhone(part)).filter(Boolean);
  return [...new Set(parts)];
}

async function isCurrentCommitteeLinked(db: AuthDatabase, personId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT cra.person_id
       FROM committee_role_assignments cra
       JOIN committee_terms ct ON ct.id = cra.committee_term_id
       JOIN committees c ON c.id = ct.committee_id
       JOIN persons p ON p.id = cra.person_id
       WHERE cra.person_id = ?
         AND cra.status = 'ACTIVE'
         AND ct.status = 'ACTIVE'
         AND c.status = 'ACTIVE'
         AND p.status = 'ACTIVE'
         AND cra.valid_from <= CURRENT_TIMESTAMP
         AND (cra.valid_to IS NULL OR cra.valid_to >= CURRENT_TIMESTAMP)
         AND ct.valid_from <= CURRENT_TIMESTAMP
         AND (ct.valid_to IS NULL OR ct.valid_to >= CURRENT_TIMESTAMP)
       LIMIT 1`,
    )
    .bind(personId)
    .first<{ person_id: string }>();
  return Boolean(row);
}

function parseBody(body: unknown): SetupInput | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const source = body as Record<string, unknown>;
  if (typeof source.phone !== "string" || typeof source.newPassword !== "string") return null;
  if (source.recoveryEmail !== undefined && typeof source.recoveryEmail !== "string") return null;
  const phone = normalizePhone(source.phone);
  const newPassword = source.newPassword;
  const recoveryEmail = typeof source.recoveryEmail === "string" ? normalizeRecoveryEmail(source.recoveryEmail) : undefined;
  if (!validPhone(phone) || newPassword.length < 12 || newPassword.length > 128) return null;
  if (recoveryEmail !== undefined && !validRecoveryEmail(recoveryEmail)) return null;
  return { phone, newPassword, recoveryEmail };
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  const env = runtimeEnv();
  const db = env.DB;
  const sessionStore = env.SESSION_STORE;
  const cookieName = env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;

  if (!COOKIE_NAME_PATTERN.test(cookieName)) return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  if (!db || !sessionStore) return errorResponse(503, traceId, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const input = parseBody(rawBody);
  if (!input) return errorResponse(400, traceId, "INVALID_INPUT", "ফোন নম্বর, নতুন পাসওয়ার্ড বা পুনরুদ্ধার ইমেলের তথ্য সঠিক নয়।");

  try {
    assertPasswordPolicy(input.newPassword);
  } catch {
    return errorResponse(400, traceId, "INVALID_INPUT", "নতুন পাসওয়ার্ড নির্ধারিত নিরাপত্তা নীতিমালা পূরণ করছে না।");
  }

  const token = parseCookie(request, cookieName);
  if (!token) {
    const response = errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
    response.headers.append("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
    return response;
  }

  try {
    const session = await getSession(db, sessionStore, token);
    if (!session) {
      const response = errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
      response.headers.append("Set-Cookie", `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
      return response;
    }

    const canonical = await db
      .prepare(
        `SELECT u.id AS user_id,
                u.phone_normalized AS user_phone,
                p.phone_private AS person_phone,
                u.must_change_password AS must_change_password,
                u.status AS user_status
         FROM users u
         LEFT JOIN persons p ON p.id = u.person_id
         WHERE u.id = ? AND u.deleted_at IS NULL
         LIMIT 1`,
      )
      .bind(session.userId)
      .first<SetupCanonicalRow>();

    const user = await findUserById(db, session.userId);
    if (!canonical || !user || user.id !== canonical.user_id || user.status !== "ACTIVE" || canonical.user_status !== "ACTIVE") {
      return errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
    }

    if (!user.personId || !(await isCurrentCommitteeLinked(db, user.personId))) {
      return errorResponse(403, traceId, "FORBIDDEN", "এই অ্যাকাউন্টের বর্তমান কমিটি-সংযোগ আর বৈধ নয়।");
    }

    const roles = await getUserRoles(db, user.id);
    if (roles.length === 0) return errorResponse(403, traceId, "FORBIDDEN", "এই অ্যাকাউন্টে কোনো সক্রিয় অনুমোদিত ভূমিকা নেই।");

    if (user.mustChangePassword !== true || Number(canonical.must_change_password) !== 1) {
      return errorResponse(409, traceId, "CONFLICT", "অ্যাকাউন্টের প্রাথমিক সেটআপ ইতিমধ্যে সম্পন্ন হয়েছে।");
    }

    const submittedPhone = input.phone;
    const registeredPhone = canonical.user_phone ? normalizePhone(canonical.user_phone) : null;
    const canonicalPhones = canonicalPhoneCandidates(canonical.person_phone);
    if ((!registeredPhone || registeredPhone !== submittedPhone) && !canonicalPhones.includes(submittedPhone)) {
      return errorResponse(403, traceId, "PHONE_MISMATCH", "ব্যক্তিগতভাবে নিবন্ধিত ফোন নম্বরটি সঠিক নয়।");
    }

    const passwordHash = await hashPassword(input.newPassword);
    const recoveryEmail = input.recoveryEmail ?? null;
    const bindingReference = crypto.randomUUID();

    const mutation = db
      .prepare(
        `UPDATE users
         SET phone_normalized = ?,
             recovery_email_private = ?,
             password_hash = ?,
             password_kdf_version = ?,
             must_change_password = 0,
             password_changed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?
           AND deleted_at IS NULL
           AND status = 'ACTIVE'
           AND must_change_password = 1`,
      )
      .bind(submittedPhone, recoveryEmail, passwordHash, PASSWORD_KDF_VERSION, user.id);

    const audit = db
      .prepare(
        `INSERT INTO auth_audit_events
         (id, actor_user_id, subject_user_id, action, result, request_id, reason_code, metadata_json)
         SELECT ?, ?, ?, 'PASSWORD_INITIALIZED', 'SUCCESS', ?, 'FIRST_LOGIN_CREDENTIALS_COMPLETED', ?
         WHERE changes() = 1`
      )
      .bind(
        crypto.randomUUID(),
        user.id,
        user.id,
        traceId,
        JSON.stringify({ kdfVersion: PASSWORD_KDF_VERSION, phoneBound: true, recoveryEmailConfigured: Boolean(input.recoveryEmail), reference: bindingReference }),
      );

    const batchResult = await db.batch([mutation, audit]);
    const results = Array.isArray(batchResult) ? (batchResult as Array<{ meta?: { changes?: number } }>) : [];
    if (results.length > 0 && (results[0]?.meta?.changes ?? 0) !== 1) {
      return errorResponse(409, traceId, "CONFLICT", "অ্যাকাউন্টের প্রাথমিক সেটআপ সম্পন্ন করা যায়নি; আবার চেষ্টা করুন।");
    }

    return NextResponse.json(
      {
        ok: true,
        data: {
          setupCompleted: true,
          mustChangePassword: false,
          userId: user.id,
          personId: user.personId,
          username: user.username,
          roles: roles.map((role) => role.code),
        },
        meta: { traceId },
      },
      { status: 200, headers: jsonHeaders() },
    );
  } catch {
    return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

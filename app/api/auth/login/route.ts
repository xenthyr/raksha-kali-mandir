import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import {
  findUserByLoginIdentifier,
  getUserRoles,
  recordLoginFailure,
  recordLoginSuccess,
} from "../../../../lib/files/auth/repository";
import { writeAuthAuditEvent } from "../../../../lib/files/auth/audit";
import { verifyPassword, PASSWORD_KDF_VERSION } from "../../../../lib/files/auth/crypto";
import { loginInputSchema, normalizeLoginIdentifier } from "../../../../lib/files/auth/normalize";
import { consumeRateLimit } from "../../../../lib/files/auth/rate-limit";
import { createSession, revokeSession } from "../../../../lib/files/auth/session";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEFAULT_SESSION_COOKIE_NAME = "raksha_kali_session";
const GENERIC_LOGIN_MESSAGE = "লগইন তথ্য সঠিক নয়।";
const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে লগইন সম্পন্ন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const REQUEST_ID_HEADER = "x-request-id";

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
  SESSION_STORE?: AuthSessionStore;
  SESSION_COOKIE_NAME?: string;
}

interface CanonicalLinkedRow {
  person_id: string;
}

function runtimeEnv(): AuthRuntimeEnv {
  const context = getCloudflareContext();
  return context.env as unknown as AuthRuntimeEnv;
}

function requestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim() || forwarded || "unknown";
}

function jsonHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function errorResponse(status: number, code: string, message: string, traceId: string, retryAfter?: number): NextResponse {
  const headers: HeadersInit = { ...jsonHeaders() };
  if (retryAfter !== undefined) headers["Retry-After"] = String(Math.max(1, Math.ceil(retryAfter)));
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
      meta: { traceId },
    },
    { status, headers },
  );
}

function isAccountTemporarilyLocked(user: { status: string; lockedUntil: string | null }, now: Date): boolean {
  if (user.status === "LOCKED") return true;
  if (!user.lockedUntil) return false;
  const lockedUntil = new Date(user.lockedUntil).getTime();
  return Number.isFinite(lockedUntil) && lockedUntil > now.getTime();
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
    .first<CanonicalLinkedRow>();
  return Boolean(row);
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  let input: unknown;

  try {
    input = await request.json();
  } catch {
    return errorResponse(400, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।", traceId);
  }

  const parsed = loginInputSchema.safeParse(input);
  if (!parsed.success) {
    return errorResponse(400, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।", traceId);
  }

  const normalized = normalizeLoginIdentifier(parsed.data.identifier);
  const env = runtimeEnv();
  const db = env.DB;
  const sessionStore = env.SESSION_STORE;
  const cookieName = env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;

  if (!db || !sessionStore) {
    return errorResponse(503, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE, traceId);
  }

  const rateLimit = await consumeRateLimit(db, "LOGIN", `${clientIp(request)}|${normalized.kind}|${normalized.value}`);
  if (!rateLimit.allowed) {
    await writeAuthAuditEvent(db, {
      action: "LOGIN_RATE_LIMITED",
      result: "DENIED",
      requestId: traceId,
      reasonCode: "AUTH_LOGIN_RATE_LIMIT",
      metadata: { identifierKind: normalized.kind },
    }).catch(() => undefined);
    return errorResponse(429, "RATE_LIMITED", "লগইনের প্রচেষ্টা সাময়িকভাবে সীমিত করা হয়েছে। পরে আবার চেষ্টা করুন।", traceId, rateLimit.retryAfterSeconds);
  }

  try {
    const user = await findUserByLoginIdentifier(db, normalized.value);

    if (!user || !user.passwordHash || user.passwordKdfVersion !== PASSWORD_KDF_VERSION) {
      await writeAuthAuditEvent(db, {
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "INVALID_CREDENTIALS",
        metadata: { identifierKind: normalized.kind },
      }).catch(() => undefined);
      return errorResponse(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    if (user.status === "DISABLED" || user.status === "ARCHIVED" || user.status === "INVITED") {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "ACCOUNT_NOT_ACTIVE",
      }).catch(() => undefined);
      return errorResponse(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    if (isAccountTemporarilyLocked(user, new Date())) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "ACCOUNT_LOCKED",
      }).catch(() => undefined);
      return errorResponse(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    const validPassword = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!validPassword) {
      await recordLoginFailure(db, user.id, user.failedLoginCount + 1, user.lockedUntil);
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "INVALID_CREDENTIALS",
      }).catch(() => undefined);
      return errorResponse(401, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    if (!user.personId || !(await isCurrentCommitteeLinked(db, user.personId))) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "CANONICAL_COMMITTEE_LINK_REQUIRED",
      }).catch(() => undefined);
      return errorResponse(403, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    const roles = await getUserRoles(db, user.id);
    if (roles.length === 0) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "LOGIN_FAILURE",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "NO_ACTIVE_AUTH_ROLE",
      }).catch(() => undefined);
      return errorResponse(403, "INVALID_CREDENTIALS", GENERIC_LOGIN_MESSAGE, traceId);
    }

    await recordLoginSuccess(db, user.id);
    const session = await createSession(db, sessionStore, user.id, cookieName, request);

    await writeAuthAuditEvent(db, {
      actorUserId: user.id,
      subjectUserId: user.id,
      action: "LOGIN_SUCCESS",
      result: "SUCCESS",
      requestId: traceId,
      reasonCode: "AUTHENTICATED",
      metadata: {
        identifierKind: normalized.kind,
        roleCount: roles.length,
      },
    }).catch(async () => {
      try {
        await revokeSession(db, sessionStore, session.sessionId, "AUDIT_WRITE_FAILURE");
      } catch {
        // Preserve the public failure response even if the compensating revocation also fails.
      }
      throw new Error("auth_audit_write_failed");
    });

    const response = NextResponse.json(
      {
        ok: true,
        data: {
          userId: user.id,
          personId: user.personId,
          username: user.username,
          roles: roles.map((role) => role.code),
          mustChangePassword: user.mustChangePassword,
          sessionExpiresAt: session.expiresAt,
        },
        meta: { traceId },
      },
      { status: 200, headers: jsonHeaders() },
    );
    response.headers.append("Set-Cookie", session.cookie);
    return response;
  } catch (error) {
    await writeAuthAuditEvent(db, {
      action: "LOGIN_FAILURE",
      result: "FAILURE",
      requestId: traceId,
      reasonCode: error instanceof Error && error.message === "auth_audit_write_failed" ? "AUDIT_FAILURE" : "INTERNAL_ERROR",
    }).catch(() => undefined);
    return errorResponse(500, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE, traceId);
  }
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { writeAuthAuditEvent } from "../../../../lib/files/auth/audit";
import { getSession, createSession, revokeSession, clearSessionCookie } from "../../../../lib/files/auth/session";
import { findUserById, getUserRoles } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEFAULT_SESSION_COOKIE_NAME = "raksha_kali_session";
const COOKIE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;
const REQUEST_ID_HEADER = "x-request-id";
const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে সেশন নবায়ন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const SESSION_INVALID_MESSAGE = "আপনার সেশনটি আর বৈধ নয়। আবার লগইন করুন।";

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
  SESSION_STORE?: AuthSessionStore;
  SESSION_COOKIE_NAME?: string;
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

function successResponse(traceId: string, data: Record<string, unknown>, cookieName: string, cookie: string): NextResponse {
  const response = NextResponse.json(
    { ok: true, data, meta: { traceId } },
    { status: 200, headers: jsonHeaders() },
  );
  response.headers.append("Set-Cookie", cookie);
  return response;
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

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  const env = runtimeEnv();
  const db = env.DB;
  const sessionStore = env.SESSION_STORE;
  const cookieName = env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;

  if (!COOKIE_NAME_PATTERN.test(cookieName)) {
    return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
  if (!db || !sessionStore) {
    return errorResponse(503, traceId, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
  }

  const currentToken = parseCookie(request, cookieName);
  if (!currentToken) {
    const response = errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
    response.headers.append("Set-Cookie", clearSessionCookie(cookieName));
    return response;
  }

  try {
    const currentSession = await getSession(db, sessionStore, currentToken);
    if (!currentSession) {
      const response = errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
      response.headers.append("Set-Cookie", clearSessionCookie(cookieName));
      return response;
    }

    const user = await findUserById(db, currentSession.userId);
    if (!user || user.status !== "ACTIVE" || !user.personId || !(await isCurrentCommitteeLinked(db, user.personId))) {
      await revokeSession(db, sessionStore, currentSession.sessionId, "AUTHORIZATION_REVOKED").catch(() => undefined);
      const response = errorResponse(401, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
      response.headers.append("Set-Cookie", clearSessionCookie(cookieName));
      return response;
    }

    const roles = await getUserRoles(db, user.id);
    if (roles.length === 0) {
      await revokeSession(db, sessionStore, currentSession.sessionId, "NO_ACTIVE_AUTH_ROLE").catch(() => undefined);
      const response = errorResponse(403, traceId, "SESSION_INVALID", SESSION_INVALID_MESSAGE);
      response.headers.append("Set-Cookie", clearSessionCookie(cookieName));
      return response;
    }

    const nextSession = await createSession(db, sessionStore, user.id, cookieName, request);

    try {
      await revokeSession(db, sessionStore, currentSession.sessionId, "SESSION_REFRESHED");
    } catch {
      await revokeSession(db, sessionStore, nextSession.sessionId, "REFRESH_ROTATION_FAILURE").catch(() => undefined);
      return errorResponse(503, traceId, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
    }

    await writeAuthAuditEvent(db, {
      actorUserId: user.id,
      subjectUserId: user.id,
      action: "SESSION_REVOKED",
      result: "SUCCESS",
      requestId: traceId,
      reasonCode: "SESSION_REFRESH_ROTATED",
      metadata: { previousSessionReplaced: true },
    }).catch(() => undefined);

    return successResponse(
      traceId,
      {
        userId: user.id,
        personId: user.personId,
        username: user.username,
        roles: roles.map((role) => role.code),
        mustChangePassword: user.mustChangePassword,
        sessionExpiresAt: nextSession.expiresAt,
      },
      cookieName,
      nextSession.cookie,
    );
  } catch {
    return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

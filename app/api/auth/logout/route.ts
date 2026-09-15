import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { writeAuthAuditEvent } from "../../../../lib/files/auth/audit";
import { getSession, revokeSession, clearSessionCookie } from "../../../../lib/files/auth/session";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DEFAULT_SESSION_COOKIE_NAME = "raksha_kali_session";
const REQUEST_ID_HEADER = "x-request-id";
const COOKIE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
  SESSION_STORE?: AuthSessionStore;
  SESSION_COOKIE_NAME?: string;
}

function runtimeEnv(): AuthRuntimeEnv {
  return getCloudflareContext().env as unknown as AuthRuntimeEnv;
}

function requestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
}

function parseCookie(request: Request, cookieName: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] ? match[1] : null;
}

function responseWithClearedCookie(cookieName: string, traceId: string): NextResponse {
  const response = NextResponse.json(
    {
      ok: true,
      data: { loggedOut: true },
      meta: { traceId },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
  response.headers.append("Set-Cookie", clearSessionCookie(cookieName));
  return response;
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  const env = runtimeEnv();
  const db = env.DB;
  const sessionStore = env.SESSION_STORE;
  const cookieName = env.SESSION_COOKIE_NAME?.trim() || DEFAULT_SESSION_COOKIE_NAME;

  if (!COOKIE_NAME_PATTERN.test(cookieName)) {
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_FAILURE", message: "সাময়িকভাবে অনুরোধ সম্পন্ন করা যাচ্ছে না।" }, meta: { traceId } },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  if (!db || !sessionStore) {
    return NextResponse.json(
      { ok: false, error: { code: "DEPENDENCY_FAILURE", message: "সাময়িকভাবে অনুরোধ সম্পন্ন করা যাচ্ছে না।" }, meta: { traceId } },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  }

  const token = parseCookie(request, cookieName);
  if (!token) return responseWithClearedCookie(cookieName, traceId);

  try {
    const session = await getSession(db, sessionStore, token);
    if (!session) return responseWithClearedCookie(cookieName, traceId);

    await revokeSession(db, sessionStore, session.sessionId, "USER_LOGOUT");
    await writeAuthAuditEvent(db, {
      actorUserId: session.userId,
      subjectUserId: session.userId,
      action: "LOGOUT",
      result: "SUCCESS",
      requestId: traceId,
      reasonCode: "USER_REQUESTED_LOGOUT",
    });

    return responseWithClearedCookie(cookieName, traceId);
  } catch (error) {
    await writeAuthAuditEvent(db, {
      action: "LOGOUT",
      result: "FAILURE",
      requestId: traceId,
      reasonCode: error instanceof Error ? "LOGOUT_OPERATION_FAILED" : "UNKNOWN_FAILURE",
    }).catch(() => undefined);
    return NextResponse.json(
      { ok: false, error: { code: "INTERNAL_FAILURE", message: "সাময়িকভাবে লগআউট সম্পন্ন করা যাচ্ছে না।" }, meta: { traceId } },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0", "X-Content-Type-Options": "nosniff" } },
    );
  }
}

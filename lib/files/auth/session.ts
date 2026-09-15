import { generateOpaqueToken, hashOpaqueToken } from "./crypto";
import { revokeAllUserSessions } from "./repository";
import type { AuthDatabase, AuthSessionStore } from "./types";

const SESSION_TTL_SECONDS = 60 * 60 * 8;
const SESSION_COOKIE_MAX_AGE = SESSION_TTL_SECONDS;

export interface CreatedSession {
  sessionId: string;
  expiresAt: string;
  cookie: string;
}

function cookieHeader(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export async function createSession(
  db: AuthDatabase,
  store: AuthSessionStore,
  userId: string,
  cookieName: string,
  request: Request,
): Promise<CreatedSession> {
  const sessionId = generateOpaqueToken();
  const sessionRecordId = await hashOpaqueToken(sessionId);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000).toISOString();
  const ip = request.headers.get("cf-connecting-ip") ?? request.headers.get("x-forwarded-for");
  const userAgent = request.headers.get("user-agent");
  const ipHash = ip ? await hashOpaqueToken(ip) : null;
  const userAgentHash = userAgent ? await hashOpaqueToken(userAgent) : null;
  await db
    .prepare(
      `INSERT INTO auth_sessions
       (id, user_id, created_at, last_seen_at, expires_at, user_agent_hash, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(sessionRecordId, userId, now.toISOString(), now.toISOString(), expiresAt, userAgentHash, ipHash)
    .run();
  await store.put(`auth:session:${sessionId}`, JSON.stringify({ userId, expiresAt }), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
  return { sessionId, expiresAt, cookie: cookieHeader(cookieName, sessionId, SESSION_COOKIE_MAX_AGE) };
}

export async function revokeSession(
  db: AuthDatabase,
  store: AuthSessionStore,
  sessionId: string,
  reason: string,
): Promise<void> {
  const sessionRecordId = await hashOpaqueToken(sessionId);
  await db
    .prepare(
      `UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP, revoke_reason = ?
       WHERE id = ? AND revoked_at IS NULL`,
    )
    .bind(reason, sessionRecordId)
    .run();
  await store.delete(`auth:session:${sessionId}`);
}

export async function revokeUserSessions(
  db: AuthDatabase,
  _store: AuthSessionStore,
  userId: string,
  reason: string,
): Promise<void> {
  // The D1 record stores only the session-token hash, so individual KV keys are
  // intentionally not reconstructable. getSession() always re-checks D1
  // revocation state, making database revocation authoritative immediately.
  await revokeAllUserSessions(db, userId, reason);
}

export async function getSession(
  db: AuthDatabase,
  store: AuthSessionStore,
  sessionToken: string,
): Promise<{ sessionId: string; userId: string; expiresAt: string } | null> {
  if (!sessionToken || sessionToken.length < 40) return null;
  const cached = await store.get<{ userId: string; expiresAt: string }>(`auth:session:${sessionToken}`, "json");
  const recordId = await hashOpaqueToken(sessionToken);
  const row = await db
    .prepare(
      `SELECT user_id, expires_at FROM auth_sessions
       WHERE id = ? AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP LIMIT 1`,
    )
    .bind(recordId)
    .first<{ user_id: string; expires_at: string }>();
  if (!row) {
    await store.delete(`auth:session:${sessionToken}`);
    return null;
  }
  if (cached && cached.userId !== row.user_id) {
    await store.delete(`auth:session:${sessionToken}`);
    return null;
  }
  await db
    .prepare(`UPDATE auth_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE id = ? AND revoked_at IS NULL`)
    .bind(recordId)
    .run();
  return { sessionId: sessionToken, userId: row.user_id, expiresAt: row.expires_at };
}

export function clearSessionCookie(cookieName: string): string {
  return `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export const SESSION_POLICY = {
  ttlSeconds: SESSION_TTL_SECONDS,
  cookieSameSite: "Lax" as const,
  httpOnly: true,
  secure: true,
  path: "/",
};

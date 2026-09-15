import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken, tokenByteLength, RESET_TOKEN_BYTE_LENGTH } from "../../../../../lib/files/auth/crypto";
import { consumeRateLimit } from "../../../../../lib/files/auth/rate-limit";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const REQUEST_ID_HEADER = "x-request-id";
const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে পাসওয়ার্ড পুনঃস্থাপনের অবস্থা যাচাই করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const INVALID_TOKEN_MESSAGE = "পাসওয়ার্ড পুনঃস্থাপনের লিঙ্কটি বৈধ নয় বা মেয়াদ শেষ হয়েছে।";

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
}

interface ResetTokenRow {
  id: string;
  user_id: string;
}

function runtimeEnv(): AuthRuntimeEnv {
  return getCloudflareContext().env as unknown as AuthRuntimeEnv;
}

function requestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function clientIp(request: Request): string {
  const direct = request.headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

function jsonHeaders(retryAfter?: number): Record<string, string> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
  if (retryAfter !== undefined) headers["Retry-After"] = String(Math.max(1, Math.ceil(retryAfter)));
  return headers;
}

function errorResponse(
  status: number,
  traceId: string,
  code: string,
  message: string,
  retryAfter?: number,
): NextResponse {
  return NextResponse.json(
    { ok: false, error: { code, message }, meta: { traceId } },
    { status, headers: jsonHeaders(retryAfter) },
  );
}

function successResponse(traceId: string): NextResponse {
  return NextResponse.json(
    { ok: true, data: { valid: true }, meta: { traceId } },
    { status: 200, headers: jsonHeaders() },
  );
}

function isCurrentCommitteeLinked(db: AuthDatabase, personId: string): Promise<boolean> {
  return db
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
    .first<{ person_id: string }>()
    .then((row) => Boolean(row));
}

async function findValidResetToken(db: AuthDatabase, token: string): Promise<ResetTokenRow | null> {
  const tokenHash = await hashOpaqueToken(token);
  return db
    .prepare(
      `SELECT id, user_id
       FROM auth_password_reset_tokens
       WHERE token_hash = ?
         AND consumed_at IS NULL
         AND invalidated_at IS NULL
         AND expires_at > CURRENT_TIMESTAMP
       LIMIT 1`,
    )
    .bind(tokenHash)
    .first<ResetTokenRow>();
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }
  const candidate = (body as Record<string, unknown>).token;
  if (typeof candidate !== "string") {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }
  const token = candidate.trim();
  if (token.length < 32 || token.length > 256) {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  try {
    if (tokenByteLength(token) !== RESET_TOKEN_BYTE_LENGTH) {
      return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
    }
  } catch {
    return errorResponse(400, traceId, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const env = runtimeEnv();
  const db = env.DB;
  if (!db) return errorResponse(503, traceId, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);

  let rateLimit: Awaited<ReturnType<typeof consumeRateLimit>>;
  try {
    rateLimit = await consumeRateLimit(db, "PASSWORD_RESET_CONFIRM", clientIp(request));
  } catch {
    return errorResponse(503, traceId, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
  }

  if (!rateLimit.allowed) {
    return errorResponse(
      429,
      traceId,
      "RATE_LIMITED",
      "অনুরোধের প্রচেষ্টা সাময়িকভাবে সীমিত করা হয়েছে। পরে আবার চেষ্টা করুন।",
      rateLimit.retryAfterSeconds,
    );
  }

  try {
    const tokenRecord = await findValidResetToken(db, token);
    if (!tokenRecord) return errorResponse(400, traceId, "RESET_INVALID", INVALID_TOKEN_MESSAGE);

    const user = await db
      .prepare(
        `SELECT id, person_id, status
         FROM users
         WHERE id = ? AND deleted_at IS NULL
         LIMIT 1`,
      )
      .bind(tokenRecord.user_id)
      .first<{ id: string; person_id: string | null; status: string }>();

    if (!user || user.status !== "ACTIVE" || !user.person_id || !(await isCurrentCommitteeLinked(db, user.person_id))) {
      return errorResponse(400, traceId, "RESET_INVALID", INVALID_TOKEN_MESSAGE);
    }

    return successResponse(traceId);
  } catch {
    return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

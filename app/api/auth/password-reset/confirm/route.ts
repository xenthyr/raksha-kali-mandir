import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { writeAuthAuditEvent } from "../../../../../lib/files/auth/audit";
import { assertPasswordPolicy, hashPassword, PASSWORD_KDF_VERSION } from "../../../../../lib/files/auth/crypto";
import { resetConfirmInputSchema } from "../../../../../lib/files/auth/normalize";
import { consumeRateLimit } from "../../../../../lib/files/auth/rate-limit";
import { consumeResetToken, findUserById, revokeAllUserSessions, setPassword } from "../../../../../lib/files/auth/repository";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে পাসওয়ার্ড পরিবর্তন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const REQUEST_ID_HEADER = "x-request-id";

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
}

function runtimeEnv(): AuthRuntimeEnv {
  return getCloudflareContext().env as unknown as AuthRuntimeEnv;
}

function requestId(request: Request): string {
  return request.headers.get(REQUEST_ID_HEADER)?.trim() || crypto.randomUUID();
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return request.headers.get("cf-connecting-ip")?.trim() || forwarded || "unknown";
}

function response(status: number, traceId: string, data: Record<string, unknown>, code?: string, message?: string): NextResponse {
  return NextResponse.json(
    code
      ? { ok: false, error: { code, message: message ?? SERVER_FAILURE_MESSAGE }, meta: { traceId } }
      : { ok: true, data, meta: { traceId } },
    {
      status,
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, traceId, {}, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const parsed = resetConfirmInputSchema.safeParse(body);
  if (!parsed.success) {
    return response(400, traceId, {}, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const env = runtimeEnv();
  const db = env.DB;
  if (!db) return response(503, traceId, {}, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);

  const limit = await consumeRateLimit(db, "PASSWORD_RESET_CONFIRM", clientIp(request));
  if (!limit.allowed) {
    await writeAuthAuditEvent(db, {
      action: "PASSWORD_RESET_RATE_LIMITED",
      result: "DENIED",
      requestId: traceId,
      reasonCode: "AUTH_RESET_CONFIRM_RATE_LIMIT",
    }).catch(() => undefined);
    const limited = response(429, traceId, {}, "RATE_LIMITED", "অনুরোধের প্রচেষ্টা সাময়িকভাবে সীমিত করা হয়েছে। পরে আবার চেষ্টা করুন।");
    limited.headers.set("Retry-After", String(Math.max(1, Math.ceil(limit.retryAfterSeconds))));
    return limited;
  }

  try {
    assertPasswordPolicy(parsed.data.newPassword);
  } catch {
    await writeAuthAuditEvent(db, {
      action: "PASSWORD_RESET_FAILED",
      result: "INVALID",
      requestId: traceId,
      reasonCode: "PASSWORD_POLICY_VIOLATION",
    }).catch(() => undefined);
    return response(400, traceId, {}, "INVALID_INPUT", "নতুন পাসওয়ার্ড নির্ধারিত নিরাপত্তা নীতিমালা পূরণ করছে না।");
  }

  const consumed = await consumeResetToken(db, parsed.data.token);
  if (!consumed) {
    await writeAuthAuditEvent(db, {
      action: "PASSWORD_RESET_FAILED",
      result: "DENIED",
      requestId: traceId,
      reasonCode: "RESET_TOKEN_INVALID_OR_EXPIRED",
    }).catch(() => undefined);
    return response(400, traceId, {}, "RESET_INVALID", "পাসওয়ার্ড পুনঃস্থাপনের লিঙ্কটি বৈধ নয় বা মেয়াদ শেষ হয়েছে।");
  }

  try {
    const user = await findUserById(db, consumed.userId);
    if (!user || user.status !== "ACTIVE" || !user.personId || !(await isCurrentCommitteeLinked(db, user.personId))) {
      await writeAuthAuditEvent(db, {
        subjectUserId: consumed.userId,
        action: "PASSWORD_RESET_FAILED",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "CANONICAL_COMMITTEE_LINK_REQUIRED",
      }).catch(() => undefined);
      return response(403, traceId, {}, "RESET_INVALID", "পাসওয়ার্ড পুনঃস্থাপনের অনুরোধটি গ্রহণ করা যাচ্ছে না।");
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await setPassword(db, user.id, passwordHash, PASSWORD_KDF_VERSION, false);
    await revokeAllUserSessions(db, user.id, "PASSWORD_RESET");

    await writeAuthAuditEvent(db, {
      actorUserId: user.id,
      subjectUserId: user.id,
      action: "PASSWORD_RESET_SUCCEEDED",
      result: "SUCCESS",
      requestId: traceId,
      reasonCode: "PASSWORD_REPLACED_AND_SESSIONS_REVOKED",
      metadata: { kdfVersion: PASSWORD_KDF_VERSION },
    }).catch(() => undefined);

    return response(200, traceId, { passwordReset: true, mustChangePassword: false });
  } catch {
    await writeAuthAuditEvent(db, {
      subjectUserId: consumed.userId,
      action: "PASSWORD_RESET_FAILED",
      result: "FAILURE",
      requestId: traceId,
      reasonCode: "PASSWORD_RESET_INTERNAL_ERROR",
    }).catch(() => undefined);
    return response(500, traceId, {}, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

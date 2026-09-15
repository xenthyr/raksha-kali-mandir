import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { Resend } from "resend";
import { writeAuthAuditEvent } from "../../../../../lib/files/auth/audit";
import { generateOpaqueToken, hashOpaqueToken } from "../../../../../lib/files/auth/crypto";
import { normalizeLoginIdentifier, resetRequestInputSchema } from "../../../../../lib/files/auth/normalize";
import { consumeRateLimit } from "../../../../../lib/files/auth/rate-limit";
import { findUserByLoginIdentifier, insertResetToken } from "../../../../../lib/files/auth/repository";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const RESET_TOKEN_TTL_SECONDS = 30 * 60;
const GENERIC_ACCEPTED_MESSAGE = "যদি তথ্যটি বৈধ হয়, তাহলে নির্দেশনা পাঠানো হবে।";
const SERVER_FAILURE_MESSAGE = "সাময়িকভাবে অনুরোধটি সম্পন্ন করা যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const REQUEST_ID_HEADER = "x-request-id";

interface AuthRuntimeEnv {
  DB?: AuthDatabase;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  NEXT_PUBLIC_SITE_URL?: string;
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

function jsonHeaders(): HeadersInit {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
  };
}

function response(status: number, traceId: string, data: Record<string, unknown>, code?: string, message?: string): NextResponse {
  return NextResponse.json(
    code
      ? { ok: false, error: { code, message: message ?? SERVER_FAILURE_MESSAGE }, meta: { traceId } }
      : { ok: true, data, meta: { traceId } },
    { status, headers: jsonHeaders() },
  );
}

function isVerifiedSender(sender: string): boolean {
  if (!sender || sender.length > 320) return false;
  const match = sender.match(/@([^>\s]+)>?$/);
  return Boolean(match?.[1]) && !match?.[1].endsWith("pages.dev");
}

function validSiteUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname !== "localhost";
  } catch {
    return false;
  }
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

async function fetchPrivateResetEmail(db: AuthDatabase, userId: string): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT COALESCE(NULLIF(trim(recovery_email_private), ''), NULLIF(trim(email_private), '')) AS email
       FROM users
       WHERE id = ? AND deleted_at IS NULL
       LIMIT 1`,
    )
    .bind(userId)
    .first<{ email: string | null }>();
  return row?.email?.trim() || null;
}

function resetLink(siteUrl: string, token: string): string {
  const url = new URL("/admin/password-reset", siteUrl);
  url.searchParams.set("token", token);
  return url.toString();
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return response(400, traceId, {}, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const parsed = resetRequestInputSchema.safeParse(body);
  if (!parsed.success) {
    return response(400, traceId, {}, "INVALID_INPUT", "অনুরোধের তথ্য সঠিক নয়।");
  }

  const normalized = normalizeLoginIdentifier(parsed.data.identifier);
  const env = runtimeEnv();
  const db = env.DB;
  if (!db) return response(503, traceId, {}, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);

  const limit = await consumeRateLimit(db, "PASSWORD_RESET_REQUEST", `${clientIp(request)}|${normalized.kind}|${normalized.value}`);
  if (!limit.allowed) {
    await writeAuthAuditEvent(db, {
      action: "PASSWORD_RESET_RATE_LIMITED",
      result: "DENIED",
      requestId: traceId,
      reasonCode: "AUTH_RESET_REQUEST_RATE_LIMIT",
      metadata: { identifierKind: normalized.kind },
    }).catch(() => undefined);
    const limited = response(429, traceId, {}, "RATE_LIMITED", "অনুরোধের প্রচেষ্টা সাময়িকভাবে সীমিত করা হয়েছে। পরে আবার চেষ্টা করুন।");
    limited.headers.set("Retry-After", String(Math.max(1, Math.ceil(limit.retryAfterSeconds))));
    return limited;
  }

  try {
    const user = await findUserByLoginIdentifier(db, normalized.value);
    if (!user || user.status !== "ACTIVE" || !user.personId) {
      await writeAuthAuditEvent(db, {
        action: "PASSWORD_RESET_REQUESTED",
        result: "NOT_FOUND",
        requestId: traceId,
        reasonCode: "RESET_GENERIC_NO_MATCH",
        metadata: { identifierKind: normalized.kind },
      }).catch(() => undefined);
      return response(202, traceId, { accepted: true, message: GENERIC_ACCEPTED_MESSAGE });
    }

    const linked = await isCurrentCommitteeLinked(db, user.personId);
    if (!linked) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        result: "DENIED",
        requestId: traceId,
        reasonCode: "RESET_GENERIC_NO_CURRENT_COMMITTEE_LINK",
      }).catch(() => undefined);
      return response(202, traceId, { accepted: true, message: GENERIC_ACCEPTED_MESSAGE });
    }

    const email = await fetchPrivateResetEmail(db, user.id);
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "PASSWORD_RESET_FAILED",
        result: "FAILURE",
        requestId: traceId,
        reasonCode: "RESET_EMAIL_UNAVAILABLE",
      }).catch(() => undefined);
      return response(503, traceId, {}, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
    }

    const apiKey = env.RESEND_API_KEY?.trim();
    const sender = env.EMAIL_FROM?.trim();
    const replyTo = env.EMAIL_REPLY_TO?.trim();
    const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
    if (!apiKey || !sender || !isVerifiedSender(sender) || !siteUrl || !validSiteUrl(siteUrl)) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "PASSWORD_RESET_FAILED",
        result: "FAILURE",
        requestId: traceId,
        reasonCode: "RESET_EMAIL_CONFIGURATION_INVALID",
      }).catch(() => undefined);
      return response(503, traceId, {}, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
    }

    const token = generateOpaqueToken(32);
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000).toISOString();
    const ipHash = await hashOpaqueToken(clientIp(request));
    const userAgent = request.headers.get("user-agent")?.trim() || null;
    const userAgentHash = userAgent ? await hashOpaqueToken(userAgent) : null;
    await insertResetToken(db, user.id, token, expiresAt, ipHash, userAgentHash);

    const resend = new Resend(apiKey);
    const emailResult = await resend.emails.send({
      from: sender,
      to: [email],
      ...(replyTo ? { replyTo } : {}),
      subject: "শ্রী শ্রী মা রক্ষা কালী মন্দির — পাসওয়ার্ড পুনঃস্থাপন",
      text: `আপনার পাসওয়ার্ড পুনঃস্থাপন করতে এই লিঙ্কটি ব্যবহার করুন: ${resetLink(siteUrl, token)}\n\nএই লিঙ্কটি ৩০ মিনিট কার্যকর থাকবে। আপনি অনুরোধ না করলে এই বার্তাটি উপেক্ষা করুন।`,
    });

    if (emailResult.error) {
      await writeAuthAuditEvent(db, {
        subjectUserId: user.id,
        action: "PASSWORD_RESET_FAILED",
        result: "FAILURE",
        requestId: traceId,
        reasonCode: "RESET_EMAIL_PROVIDER_FAILURE",
        metadata: { provider: "resend" },
      }).catch(() => undefined);
      return response(503, traceId, {}, "DEPENDENCY_FAILURE", SERVER_FAILURE_MESSAGE);
    }

    await writeAuthAuditEvent(db, {
      subjectUserId: user.id,
      action: "PASSWORD_RESET_REQUESTED",
      result: "SUCCESS",
      requestId: traceId,
      reasonCode: "RESET_TOKEN_ISSUED",
      metadata: { provider: "resend", expiresAt },
    }).catch(() => undefined);

    return response(202, traceId, { accepted: true, message: GENERIC_ACCEPTED_MESSAGE });
  } catch {
    await writeAuthAuditEvent(db, {
      action: "PASSWORD_RESET_FAILED",
      result: "FAILURE",
      requestId: traceId,
      reasonCode: "RESET_REQUEST_INTERNAL_ERROR",
    }).catch(() => undefined);
    return response(500, traceId, {}, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

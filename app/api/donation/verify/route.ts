import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserPermissions } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";
import { getDonationForVerification, getVerificationRecord } from "../../../../db/repositories/donation";
import { CANONICAL } from "../../../../lib/config/canonical";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8192;
const COOKIE_NAME = "raksha_kali_session";
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; SESSION_COOKIE_NAME?: string };
type Body = { donationId?: unknown; decision?: unknown; reason?: unknown };
type Verification = { id: string; donation_id: string; status: string; duplicate_flag: number; amount_mismatch_flag: number; verification_reference: string };

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS });
}

function parseCookie(request: Request, cookieName: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const escaped = cookieName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function parseBody(request: Request): Promise<Body | null> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > BODY_LIMIT) return null;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Body : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v && v.length <= max ? v : null;
}

async function requirePermission(env: Env, request: Request): Promise<{ userId: string } | { error: NextResponse }> {
  if (!env.DB || !env.SESSION_STORE) return { error: out(503, traceId(request), null, { code: "DEPENDENCY_FAILURE", message: "যাচাই ব্যবস্থা এখন পাওয়া যাচ্ছে না।" }) };
  const token = parseCookie(request, env.SESSION_COOKIE_NAME?.trim() || COOKIE_NAME);
  if (!token) return { error: out(401, traceId(request), null, { code: "SESSION_INVALID", message: "অনুগ্রহ করে প্রশাসনিক অ্যাকাউন্ট দিয়ে লগইন করুন।" }) };
  const session = await getSession(env.DB, env.SESSION_STORE, token);
  if (!session) return { error: out(401, traceId(request), null, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" }) };
  const user = await findUserById(env.DB, session.userId);
  if (!user || user.status !== "ACTIVE" || !user.personId) return { error: out(403, traceId(request), null, { code: "FORBIDDEN", message: "এই কাজের অনুমতি নেই।" }) };
  const link = await env.DB.prepare(
    `SELECT cra.person_id FROM committee_role_assignments cra JOIN committee_terms ct ON ct.id=cra.committee_term_id JOIN committees c ON c.id=ct.committee_id JOIN persons p ON p.id=cra.person_id
     WHERE cra.person_id=? AND cra.status='ACTIVE' AND ct.id=? AND ct.status='ACTIVE' AND c.id=? AND c.status='ACTIVE' AND p.status='ACTIVE'
       AND cra.valid_from<=CURRENT_TIMESTAMP AND (cra.valid_to IS NULL OR cra.valid_to>=CURRENT_TIMESTAMP)
       AND ct.valid_from<=CURRENT_TIMESTAMP AND (ct.valid_to IS NULL OR ct.valid_to>=CURRENT_TIMESTAMP) LIMIT 1`,
  ).bind(user.personId, CANONICAL.currentCommitteeTermId, CANONICAL.committeeId).first<{ person_id: string }>();
  if (!link) return { error: out(403, traceId(request), null, { code: "FORBIDDEN", message: "বর্তমান কমিটির অনুমোদিত সদস্যদের জন্যই এই কাজটি সংরক্ষিত।" }) };
  const permissions = await getUserPermissions(env.DB, user.id);
  if (!permissions.some((permission) => permission.code === "finance.verify")) return { error: out(403, traceId(request), null, { code: "FORBIDDEN", message: "এই আর্থিক যাচাইয়ের অনুমতি আপনার নেই।" }) };
  return { userId: user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const principal = await requirePermission(env, request);
  if ("error" in principal) return principal.error;
  if (!env.DB) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "যাচাই ব্যবস্থা এখন পাওয়া যাচ্ছে না।" });

  const body = await parseBody(request);
  const donationId = body ? text(body.donationId, 128) : null;
  const decision = body ? text(body.decision, 16)?.toUpperCase() : null;
  const reason = body ? text(body.reason, 500) : null;
  if (!body || !donationId || !decision || (decision !== "VERIFIED" && decision !== "REJECTED")) {
    return out(400, trace, null, { code: "INVALID_INPUT", message: "দানের পরিচয় ও যাচাইয়ের সিদ্ধান্ত সঠিকভাবে দিন।" });
  }
  if (decision === "REJECTED" && !reason) return out(400, trace, null, { code: "REJECTION_REASON_REQUIRED", message: "দানের প্রত্যাখ্যানের কারণ দিতে হবে।" });

  try {
    const donation = await getDonationForVerification(env.DB, donationId) as Record<string, unknown> | null;
    if (!donation) return out(404, trace, null, { code: "NOT_FOUND", message: "দানের তথ্য পাওয়া যায়নি।" });
    const verification = await getVerificationRecord(env.DB, donationId) as Verification | null;
    if (!verification) return out(409, trace, null, { code: "VERIFICATION_MISSING", message: "দানের UTR যাচাইয়ের রেকর্ড পাওয়া যায়নি।" });
    if (!["PENDING"].includes(verification.status)) return out(409, trace, null, { code: "INVALID_STATE", message: "এই যাচাইয়ের অবস্থা থেকে নতুন সিদ্ধান্ত নেওয়া যাবে না।" });
    if (verification.duplicate_flag === 1 || verification.amount_mismatch_flag === 1) {
      return out(409, trace, null, { code: "REVIEW_REQUIRED", message: "ডুপ্লিকেট বা পরিমাণের অমিল আগে নিষ্পত্তি করতে হবে।" });
    }
    if (String(donation.status) !== "PENDING_VERIFICATION") return out(409, trace, null, { code: "INVALID_STATE", message: "দানটি এখন যাচাইয়ের অপেক্ষায় নেই।" });

    const nextDonationStatus = decision;
    const verificationUpdate = env.DB.prepare(
      `UPDATE donation_verifications SET status=?,verifier_user_id=?,decision_reason_private=?,reviewed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND status='PENDING' AND duplicate_flag=0 AND amount_mismatch_flag=0`,
    ).bind(decision, principal.userId, reason, verification.id);
    const donationUpdate = env.DB.prepare(
      `UPDATE donations SET status=?,verified_by=CASE WHEN ?='VERIFIED' THEN ? ELSE NULL END,verified_at=CASE WHEN ?='VERIFIED' THEN CURRENT_TIMESTAMP ELSE NULL END,verification_status=CASE WHEN ?='VERIFIED' THEN 'VERIFIED' ELSE 'REJECTED' END,version=version+1,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND status='PENDING_VERIFICATION' AND deleted_at IS NULL`,
    ).bind(nextDonationStatus, decision, principal.userId, decision, decision, donationId);
    const attemptUpdate = env.DB.prepare(
      `UPDATE donation_attempts SET status=CASE WHEN ?='VERIFIED' THEN 'COMPLETED' ELSE 'FAILED' END,completed_at=CURRENT_TIMESTAMP,failure_code=CASE WHEN ?='REJECTED' THEN 'DONATION_REJECTED' ELSE NULL END,updated_at=CURRENT_TIMESTAMP
       WHERE donation_id=? AND status='UTR_SUBMITTED'`,
    ).bind(decision, decision, donationId);
    const auditRevision = crypto.randomUUID();
    const auditMutation = env.DB.prepare(
      `UPDATE donations SET revision_id=COALESCE(revision_id,?) WHERE id=?`,
    ).bind(auditRevision, donationId);
    const batchResult = await env.DB.batch([verificationUpdate, donationUpdate, attemptUpdate, auditMutation]) as Array<{ meta?: { changes?: number } }>;
    const verificationChanges = Number(batchResult?.[0]?.meta?.changes ?? 0);
    const donationChanges = Number(batchResult?.[1]?.meta?.changes ?? 0);
    if (verificationChanges !== 1 || donationChanges !== 1) return out(409, trace, null, { code: "WRITE_CONFLICT", message: "যাচাইয়ের অবস্থা ইতিমধ্যে পরিবর্তিত হয়েছে। আবার তথ্য পরীক্ষা করুন।" });

    return out(200, trace, {
      donationId,
      decision,
      status: decision,
      paymentVerified: decision === "VERIFIED",
      verifiedByUserId: principal.userId,
      reviewedAt: new Date().toISOString(),
    });
  } catch {
    return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "দানের যাচাই সম্পন্ন করা যায়নি। পরে আবার চেষ্টা করুন।" });
  }
}

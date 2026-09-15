import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8192;
const KEY_LIMIT = 128;
const UTR_LIMIT = 64;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: D1Like };
type DonationRow = { id: string; public_reference: string; amount_paise: number; status: string };
type VerificationRow = { id: string; donation_id: string; verification_reference: string; status: string; submitted_amount_paise: number | null; duplicate_flag: number; amount_mismatch_flag: number; submitted_at: string; reviewed_at: string | null };

type Body = { donationId?: unknown; utr?: unknown; amountPaise?: unknown };

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function result(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(
    error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } },
    { status, headers: HEADERS },
  );
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
  const normalized = value.trim();
  return normalized && normalized.length <= max ? normalized : null;
}

function normalizedId(value: unknown): string | null {
  const v = text(value, 128);
  return v && /^[A-Za-z0-9_-]+$/.test(v) ? v : null;
}

function normalizedUtr(value: unknown): string | null {
  const v = text(value, UTR_LIMIT);
  if (!v || !/^[A-Za-z0-9-]+$/.test(v) || v.length < 6) return null;
  return v.toUpperCase();
}

function positivePaise(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const db = env.DB;
  if (!db) return result(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "UTR জমা দেওয়ার ব্যবস্থা এখন পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।" });

  const body = await parseBody(request);
  if (!body) return result(400, trace, null, { code: "INVALID_BODY", message: "অনুরোধের তথ্য সঠিক নয়।" });
  const donationId = normalizedId(body.donationId);
  const utr = normalizedUtr(body.utr);
  const submittedAmountPaise = positivePaise(body.amountPaise);
  const idem = text(request.headers.get("Idempotency-Key") ?? crypto.randomUUID(), KEY_LIMIT);
  if (!donationId || !utr || submittedAmountPaise === null || !idem) {
    return result(400, trace, null, { code: "INVALID_INPUT", message: "দানের পরিচয়, UTR এবং প্রদত্ত পরিমাণ সঠিকভাবে দিন।" });
  }

  try {
    const donation = await db.prepare(
      `SELECT id,public_reference,amount_paise,status FROM donations WHERE id=? AND deleted_at IS NULL LIMIT 1`,
    ).bind(donationId).first<DonationRow>();
    if (!donation) return result(404, trace, null, { code: "NOT_FOUND", message: "দানের তথ্য পাওয়া যায়নি।" });

    if (!["CREATED", "UPI_INITIATED"].includes(donation.status)) {
      return result(409, trace, null, { code: "INVALID_STATE", message: "এই দানে এখন UTR জমা দেওয়া যাবে না।" });
    }

    const verificationReference = `VR-${(await sha256Hex(`${donation.id}:${idem}`)).slice(0, 32).toUpperCase()}`;
    const replay = await db.prepare(
      `SELECT id,donation_id,verification_reference,status,submitted_amount_paise,duplicate_flag,amount_mismatch_flag,submitted_at,reviewed_at
       FROM donation_verifications WHERE donation_id=? AND verification_reference=? LIMIT 1`,
    ).bind(donation.id, verificationReference).first<VerificationRow>();
    if (replay) {
      return result(200, trace, {
        donationId: donation.id,
        publicReference: donation.public_reference,
        verificationReference: replay.verification_reference,
        status: replay.status,
        amountMismatch: replay.amount_mismatch_flag === 1,
        duplicate: replay.duplicate_flag === 1,
        replayed: true,
      });
    }

    const duplicate = await db.prepare(
      `SELECT donation_id,verification_reference,status FROM donation_verifications WHERE utr_normalized_private=? LIMIT 1`,
    ).bind(utr).first<{ donation_id: string; verification_reference: string; status: string }>();
    if (duplicate) {
      return result(409, trace, null, { code: "DUPLICATE_UTR", message: "এই UTR আগে জমা হয়েছে; যাচাইয়ের জন্য একই UTR পুনরায় গ্রহণ করা যাচ্ছে না।" });
    }

    const mismatch = submittedAmountPaise !== donation.amount_paise;
    const verificationStatus = mismatch ? "MISMATCH_REVIEW" : "PENDING";
    const donationStatus = "PENDING_VERIFICATION";
    const verificationId = crypto.randomUUID();
    const verificationInsert = db.prepare(
      `INSERT INTO donation_verifications
        (id,donation_id,verification_reference,utr_private,utr_normalized_private,submitted_amount_paise,status,duplicate_flag,amount_mismatch_flag,submitted_at,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
    ).bind(verificationId, donation.id, verificationReference, utr, utr, submittedAmountPaise, verificationStatus, 0, mismatch ? 1 : 0);
    const donationUpdate = db.prepare(
      `UPDATE donations SET status=?,version=version+1,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND deleted_at IS NULL AND status IN ('CREATED','UPI_INITIATED','UTR_SUBMITTED','PENDING_VERIFICATION')`,
    ).bind(donationStatus, donation.id);
    const attemptUpdate = db.prepare(
      `UPDATE donation_attempts SET status='UTR_SUBMITTED',updated_at=CURRENT_TIMESTAMP
       WHERE donation_id=? AND status='INITIATED'`,
    ).bind(donation.id);
    await db.batch([verificationInsert, donationUpdate, attemptUpdate]);

    return result(201, trace, {
      donationId: donation.id,
      publicReference: donation.public_reference,
      verificationReference,
      status: verificationStatus,
      amountMismatch: mismatch,
      duplicate: false,
      paymentVerified: false,
      replayed: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNIQUE") || message.toUpperCase().includes("CONSTRAINT")) {
      return result(409, trace, null, { code: "WRITE_CONFLICT", message: "UTR জমা দেওয়ার সময় অনন্যতার সংঘাত হয়েছে। আবার চেষ্টা করুন।" });
    }
    return result(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "UTR জমা দেওয়া যায়নি। পরে আবার চেষ্টা করুন।" });
  }
}

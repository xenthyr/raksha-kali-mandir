import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getDonationForVerification, getVerificationRecord } from "../../../../../../db/repositories/donation";
import { CANONICAL } from "../../../../../../lib/config/canonical";
import type { D1Like } from "../../../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ID_LIMIT = 128;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type DonationRow = {
  id: string;
  publicReference: string;
  purposeCode: string;
  amountPaise: number;
  status: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  revisionId: string | null;
  version: number;
};

type VerificationRow = {
  id: string;
  donation_id: string;
  verification_reference: string;
  status: string;
  submitted_amount_paise: number | null;
  duplicate_flag: number;
  amount_mismatch_flag: number;
  submitted_at: string;
  reviewed_at: string | null;
};

type ReceiptRow = { receipt_number: string; status: string };

type Env = { DB?: D1Like };

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function response(
  status: number,
  trace: string,
  data: unknown,
  error?: { code: string; message: string },
): NextResponse {
  return NextResponse.json(
    error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } },
    { status, headers: HEADERS },
  );
}

function safePathId(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized && normalized.length <= ID_LIMIT ? normalized : null;
}

function publicStatus(status: string): string {
  if (status === "CREATED" || status === "UPI_INITIATED") return "PAYMENT_PENDING";
  if (status === "UTR_SUBMITTED" || status === "PENDING_VERIFICATION") return "PENDING_VERIFICATION";
  if (status === "VERIFIED" || status === "RECEIPT_ISSUED" || status === "LEDGER_POSTED") return "VERIFIED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "REFUNDED") return "REFUNDED";
  return "PROCESSING";
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const db = env.DB;
  if (!db) return response(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "দানের তথ্য এখন পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।" });

  const pathId = safePathId((await context.params).id);
  if (!pathId) return response(400, trace, null, { code: "INVALID_ID", message: "দানের পরিচয় সঠিক নয়।" });

  try {
    const repositoryRow = await getDonationForVerification(db, pathId) as Record<string, unknown> | null;
    let row: DonationRow | null = repositoryRow ? {
      id: String(repositoryRow.id),
      publicReference: String(repositoryRow.public_reference),
      purposeCode: String(repositoryRow.purpose_code),
      amountPaise: Number(repositoryRow.amount_paise),
      status: String(repositoryRow.status),
      verifiedBy: repositoryRow.verified_by == null ? null : String(repositoryRow.verified_by),
      verifiedAt: repositoryRow.verified_at == null ? null : String(repositoryRow.verified_at),
      revisionId: repositoryRow.revision_id == null ? null : String(repositoryRow.revision_id),
      version: Number(repositoryRow.version),
    } : null;
    if (!row) {
      const byReference = await db.prepare(
        `SELECT id,public_reference AS publicReference,purpose_code AS purposeCode,amount_paise AS amountPaise,status,verified_by AS verifiedBy,verified_at AS verifiedAt,revision_id AS revisionId,version
         FROM donations WHERE public_reference=? AND deleted_at IS NULL LIMIT 1`,
      ).bind(pathId).first<DonationRow>();
      row = byReference ?? null;
    }
    if (!row) return response(404, trace, null, { code: "NOT_FOUND", message: "দানের তথ্য পাওয়া যায়নি।" });

    const verification = await getVerificationRecord(db, row.id) as VerificationRow | null;
    const receipt = await db.prepare(
      `SELECT receipt_number,status FROM receipts WHERE donation_id=? AND status IN ('ISSUED','CORRECTED') LIMIT 1`,
    ).bind(row.id).first<ReceiptRow>();

    const data: Record<string, unknown> = {
      publicReference: row.publicReference,
      amountPaise: row.amountPaise,
      currency: "INR",
      purposeCode: row.purposeCode,
      status: publicStatus(row.status),
    };
    if (verification) {
      data.verification = {
        status: verification.status,
        submittedAt: verification.submitted_at,
        reviewedAt: verification.reviewed_at,
        amountMismatch: verification.amount_mismatch_flag === 1,
        duplicateFlag: verification.duplicate_flag === 1,
      };
    } else {
      data.verification = { status: "NOT_SUBMITTED" };
    }
    if (row.verifiedAt) data.verifiedAt = row.verifiedAt;
    if (receipt) data.receiptNumber = receipt.receipt_number;

    return response(200, trace, data);
  } catch {
    return response(500, trace, null, { code: "INTERNAL_FAILURE", message: "দানের তথ্য এখন নির্ভরযোগ্যভাবে পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।" });
  }
}

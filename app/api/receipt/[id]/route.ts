import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { D1Like } from "../../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ID_LIMIT = 128;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: D1Like };
type ReceiptRow = {
  receipt_id: string;
  receipt_number: string;
  receipt_series: string;
  receipt_year: number;
  sequence_number: number;
  issued_amount_paise: number;
  currency: string;
  receipt_status: string;
  issued_at: string;
  donation_id: string;
  public_reference: string;
  purpose_code: string;
  donation_status: string;
  verification_date: string | null;
};

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function output(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS });
}

function validId(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  return normalized && normalized.length <= ID_LIMIT ? normalized : null;
}

export async function GET(request: Request, context: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const db = env.DB;
  if (!db) return output(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "রসিদের তথ্য এখন পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।" });
  const id = validId((await context.params).id);
  if (!id) return output(400, trace, null, { code: "INVALID_ID", message: "রসিদের পরিচয় সঠিক নয়।" });

  try {
    const row = await db.prepare(
      `SELECT r.id AS receipt_id,r.receipt_number,r.receipt_series,r.receipt_year,r.sequence_number,r.issued_amount_paise,r.currency,r.status AS receipt_status,r.issued_at,
              d.id AS donation_id,d.public_reference,d.purpose_code,d.status AS donation_status,dv.reviewed_at AS verification_date
       FROM receipts r
       JOIN donations d ON d.id=r.donation_id AND d.deleted_at IS NULL
       LEFT JOIN donation_verifications dv ON dv.donation_id=d.id AND dv.status='VERIFIED'
       WHERE (r.id=? OR r.receipt_number=?) AND r.status IN ('ISSUED','CORRECTED') LIMIT 1`,
    ).bind(id, id).first<ReceiptRow>();

    if (!row) return output(404, trace, null, { code: "NOT_FOUND", message: "যাচাইকৃত রসিদ পাওয়া যায়নি।" });
    if (!["VERIFIED", "RECEIPT_ISSUED", "LEDGER_POSTED"].includes(row.donation_status)) {
      return output(409, trace, null, { code: "NOT_VERIFIED", message: "এই দানের পেমেন্ট এখনও যাচাই সম্পন্ন হয়নি।" });
    }

    return output(200, trace, {
      receiptNumber: row.receipt_number,
      receiptSeries: row.receipt_series,
      receiptYear: row.receipt_year,
      issuedAmountPaise: row.issued_amount_paise,
      currency: row.currency,
      status: row.receipt_status,
      issuedAt: row.issued_at,
      publicReference: row.public_reference,
      purposeCode: row.purpose_code,
      verificationDate: row.verification_date,
    });
  } catch {
    return output(500, trace, null, { code: "INTERNAL_FAILURE", message: "রসিদের তথ্য এখন নির্ভরযোগ্যভাবে পাওয়া যাচ্ছে না।" });
  }
}

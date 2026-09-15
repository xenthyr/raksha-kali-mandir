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

interface Env { DB?: D1Like }
interface ReceiptRow {
  receipt_id: string;
  receipt_number: string;
  receipt_series: string;
  receipt_year: number;
  issued_amount_paise: number;
  currency: string;
  receipt_status: "ISSUED" | "REVOKED" | "CORRECTED";
  issued_at: string;
  donation_id: string;
  public_reference: string;
  purpose_code: string;
  donation_status: string;
  verification_date: string | null;
}

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function response(
  status: number,
  trace: string,
  data?: unknown,
  error?: { code: string; message: string },
): NextResponse {
  const body = error
    ? { ok: false, error, meta: { traceId: trace } }
    : { ok: true, data, meta: { traceId: trace } };
  return NextResponse.json(body, { status, headers: HEADERS });
}

function normalizeId(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = value.trim();
  if (!normalized || normalized.length > ID_LIMIT) return null;
  return normalized;
}

function safePurpose(value: string): string {
  return value.length <= 128 ? value : value.slice(0, 128);
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const trace = traceId(request);
  let env: Env;
  try {
    env = getCloudflareContext().env as unknown as Env;
  } catch {
    return response(503, trace, undefined, {
      code: "DEPENDENCY_FAILURE",
      message: "রসিদ যাচাই ব্যবস্থা এখন উপলভ্য নয়। পরে আবার চেষ্টা করুন।",
    });
  }
  if (!env.DB) {
    return response(503, trace, undefined, {
      code: "DEPENDENCY_FAILURE",
      message: "রসিদ যাচাই ব্যবস্থা এখন উপলভ্য নয়। পরে আবার চেষ্টা করুন।",
    });
  }

  const id = normalizeId((await context.params).id);
  if (!id) {
    return response(400, trace, undefined, {
      code: "INVALID_ID",
      message: "রসিদের পরিচয় সঠিক নয়।",
    });
  }

  try {
    const row = await env.DB.prepare(
      `SELECT
         r.id AS receipt_id,
         r.receipt_number,
         r.receipt_series,
         r.receipt_year,
         r.issued_amount_paise,
         r.currency,
         r.status AS receipt_status,
         r.issued_at,
         d.id AS donation_id,
         d.public_reference,
         d.purpose_code,
         d.status AS donation_status,
         dv.reviewed_at AS verification_date
       FROM receipts r
       JOIN donations d
         ON d.id = r.donation_id
        AND d.deleted_at IS NULL
       LEFT JOIN donation_verifications dv
         ON dv.donation_id = d.id
        AND dv.status = 'VERIFIED'
       WHERE (r.id = ? OR r.receipt_number = ?)
       LIMIT 1`,
    ).bind(id, id).first<ReceiptRow>();

    if (!row) {
      return response(404, trace, undefined, {
        code: "NOT_FOUND",
        message: "রসিদটি পাওয়া যায়নি।",
      });
    }

    if (row.receipt_status === "REVOKED") {
      return response(200, trace, {
        receiptNumber: row.receipt_number,
        receiptSeries: row.receipt_series,
        receiptYear: row.receipt_year,
        status: "REVOKED",
        valid: false,
      });
    }

    if (!["VERIFIED", "RECEIPT_ISSUED", "LEDGER_POSTED"].includes(row.donation_status)) {
      return response(409, trace, undefined, {
        code: "NOT_VERIFIED",
        message: "এই রসিদের দানের পেমেন্ট যাচাই এখনও সম্পূর্ণ হয়নি।",
      });
    }

    if (!row.verification_date) {
      return response(409, trace, undefined, {
        code: "VERIFICATION_DATA_UNAVAILABLE",
        message: "রসিদের যাচাইয়ের তারিখ এখন নির্ভরযোগ্যভাবে পাওয়া যাচ্ছে না।",
      });
    }

    return response(200, trace, {
      receiptNumber: row.receipt_number,
      receiptSeries: row.receipt_series,
      receiptYear: row.receipt_year,
      amountPaise: row.issued_amount_paise,
      currency: row.currency,
      purpose: safePurpose(row.purpose_code),
      verificationDate: row.verification_date,
      status: row.receipt_status,
      valid: true,
      publicReference: row.public_reference,
    });
  } catch {
    return response(500, trace, undefined, {
      code: "INTERNAL_FAILURE",
      message: "রসিদের তথ্য এখন নির্ভরযোগ্যভাবে যাচাই করা যাচ্ছে না।",
    });
  }
}

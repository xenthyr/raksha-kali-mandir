import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "../../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 4096;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase };
type Body = { operationType?: unknown; idempotencyKey?: unknown; requestHash?: unknown };
type Row = { id: string; operation_type: string; idempotency_key_hash: string; request_hash: string; ticket_id: string | null; response_status_code: number | null; response_body_opaque: string | null; state: string };

function out(status: number, traceId: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(error ? { ok: false, error, meta: { traceId } } : { ok: true, data, meta: { traceId } }, { status, headers: HEADERS });
}
function trace(request: Request) { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
async function bodyOf(request: Request): Promise<Body | null> {
  const len = request.headers.get("content-length");
  if (len && (!/^\d+$/.test(len) || Number(len) > BODY_LIMIT)) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return null;
  try { const parsed: unknown = JSON.parse(raw); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Body : null; } catch { return null; }
}
function text(v: unknown, max: number) { if (typeof v !== "string") return null; const s = v.trim(); return s && s.length <= max ? s : null; }

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = trace(request);
  const { DB } = getCloudflareContext().env as unknown as Env;
  if (!DB) return out(503, traceId, null, { code: "DEPENDENCY_FAILURE", message: "অনুরোধের পুনরাবৃত্তি-নিয়ন্ত্রণ এখন প্রস্তুত নয়।" });
  const body = await bodyOf(request);
  const operationType = body ? text(body.operationType, 32)?.toUpperCase() : null;
  const idempotencyKey = body ? text(body.idempotencyKey, 200) : null;
  const requestHashInput = body ? text(body.requestHash, 128) : null;
  if (!body || !operationType || !idempotencyKey || idempotencyKey.length < 16 || !requestHashInput) return out(400, traceId, null, { code: "INVALID_INPUT", message: "Operation type, Idempotency-Key এবং request hash দিতে হবে।" });
  try {
    const keyHash = await hashOpaqueToken(idempotencyKey);
    const requestHash = /^[0-9a-z_-]{40,128}$/i.test(requestHashInput) ? requestHashInput : await hashOpaqueToken(requestHashInput);
    const existing = await DB.prepare(`SELECT id,operation_type,idempotency_key_hash,request_hash,ticket_id,response_status_code,response_body_opaque,state FROM support_idempotency_records WHERE idempotency_key_hash=? LIMIT 1`).bind(keyHash).first<Row>();
    if (existing) {
      if (existing.operation_type !== operationType || existing.request_hash !== requestHash) return out(409, traceId, null, { code: "IDEMPOTENCY_CONFLICT", message: "এই Idempotency-Key অন্য অনুরোধের সঙ্গে যুক্ত।" });
      return out(200, traceId, { state: existing.state, ticketId: existing.ticket_id, completed: existing.state === "COMPLETED", responseStatusCode: existing.response_status_code });
    }
    const id = crypto.randomUUID();
    await DB.prepare(`INSERT INTO support_idempotency_records(id,operation_type,idempotency_key_hash,request_hash,state,created_at,updated_at) VALUES(?,?,?,?, 'RESERVED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(id, operationType, keyHash, requestHash).run();
    return out(201, traceId, { state: "RESERVED", ticketId: null, completed: false, recordId: id });
  } catch {
    return out(500, traceId, null, { code: "INTERNAL_FAILURE", message: "অনুরোধ পুনরাবৃত্তি-নিয়ন্ত্রণ এখন সম্পন্ন করা যাচ্ছে না।" });
  }
}

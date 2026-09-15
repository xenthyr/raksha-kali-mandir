import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken, verifyPassword } from "../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 4096;
const MAX_REFERENCE = 20;
const MAX_PIN = 4;
const MAX_FAILURES_PER_IP = 5;
const WINDOW_MINUTES = 15;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase };
type Body = { reference?: unknown; pin?: unknown };
type TicketRow = {
  id: string;
  public_reference: string;
  category_code: string;
  subject: string;
  status: string;
  priority: string;
  tracking_pin_hash: string;
  created_at: string;
  updated_at: string;
};
type HistoryRow = { id: string; to_status: string; occurred_at: string };
type MessageRow = { id: string; body_private: string; created_at: string };
type AttemptRow = { count: number };

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function response(status: number, traceIdValue: string, data: unknown, error?: { code: string; message: string }) {
  return NextResponse.json(
    error ? { ok: false, error, meta: { traceId: traceIdValue } } : { ok: true, data, meta: { traceId: traceIdValue } },
    { status, headers: RESPONSE_HEADERS },
  );
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

async function parseBody(request: Request): Promise<Body | null> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > BODY_LIMIT)) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? (value as Body) : null;
  } catch {
    return null;
  }
}

function clientAddress(request: Request): string {
  return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

function publicStatus(status: string): string {
  switch (status) {
    case "OPEN":
      return "পর্যালোচনাধীন";
    case "IN_PROGRESS":
    case "WAITING_USER":
      return "প্রক্রিয়াধীন";
    case "RESOLVED":
    case "CLOSED":
      return "মীমাংসিত";
    case "REJECTED":
      return "পর্যালোচনাধীন";
    default:
      return "পর্যালোচনাধীন";
  }
}

async function recordAttempt(db: AuthDatabase, ticketId: string | null, reference: string, request: Request, outcome: string, retryAfterSeconds: number | null, trace: string): Promise<void> {
  const ipHash = await hashOpaqueToken(clientAddress(request));
  const fingerprintSeed = [request.headers.get("user-agent") ?? "", request.headers.get("accept-language") ?? ""].join("|");
  const fingerprintHash = await hashOpaqueToken(fingerprintSeed);
  await db.prepare(
    `INSERT INTO support_tracking_attempts
      (id,ticket_id,attempted_reference,client_fingerprint_hash,ip_hash,outcome,attempted_at,retry_after_seconds,metadata_json)
     VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?)`,
  ).bind(
    crypto.randomUUID(),
    ticketId,
    reference || null,
    fingerprintHash,
    ipHash,
    outcome,
    retryAfterSeconds,
    JSON.stringify({ traceId: trace }),
  ).run();
}

async function rateLimited(db: AuthDatabase, request: Request): Promise<boolean> {
  const ipHash = await hashOpaqueToken(clientAddress(request));
  const fingerprintSeed = [request.headers.get("user-agent") ?? "", request.headers.get("accept-language") ?? ""].join("|");
  const fingerprintHash = await hashOpaqueToken(fingerprintSeed);
  const row = await db.prepare(
    `SELECT COUNT(*) AS count FROM support_tracking_attempts
     WHERE (ip_hash=? OR client_fingerprint_hash=?)
       AND outcome IN ('INVALID_REFERENCE','INVALID_PIN','RATE_LIMITED','DENIED')
       AND attempted_at >= datetime('now', ?)`
  ).bind(ipHash, fingerprintHash, `-${WINDOW_MINUTES} minutes`).first<AttemptRow>();
  return Number(row?.count ?? 0) >= MAX_FAILURES_PER_IP;
}

function safeTicket(ticket: TicketRow, history: HistoryRow[], messages: MessageRow[]) {
  return {
    ticketId: ticket.id,
    publicReference: ticket.public_reference,
    category: ticket.category_code,
    subject: ticket.subject,
    status: publicStatus(ticket.status),
    statusCode: ticket.status,
    createdAt: ticket.created_at,
    updatedAt: ticket.updated_at,
    history: history.map((item) => ({ id: item.id, status: publicStatus(item.to_status), statusCode: item.to_status, occurredAt: item.occurred_at })),
    replies: messages.map((item) => ({ id: item.id, body: item.body_private, createdAt: item.created_at })),
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const runtime = getCloudflareContext().env as unknown as Env;
  const db = runtime.DB;
  if (!db) return response(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "টিকিট ট্র্যাকিং ব্যবস্থা এখন প্রস্তুত নয়।" });

  const body = await parseBody(request);
  const reference = text(body?.reference, MAX_REFERENCE)?.toUpperCase() ?? null;
  const pin = text(body?.pin, MAX_PIN);
  if (!body || !reference || !/^MRK-[0-9]{4}-[0-9]{6}$/.test(reference) || !pin || !/^\d{4}$/.test(pin)) {
    return response(400, trace, null, { code: "INVALID_INPUT", message: "Reference এবং ৪-সংখ্যার PIN সঠিকভাবে দিতে হবে।" });
  }

  try {
    if (await rateLimited(db, request)) {
      await recordAttempt(db, null, reference, request, "RATE_LIMITED", 900, trace);
      return response(429, trace, null, { code: "RATE_LIMITED", message: "অনেকবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।" });
    }

    const ticket = await db.prepare(
      `SELECT id,public_reference,category_code,subject,status,priority,tracking_pin_hash,created_at,updated_at
       FROM support_tickets WHERE public_reference=? LIMIT 1`,
    ).bind(reference).first<TicketRow>();

    if (!ticket) {
      await recordAttempt(db, null, reference, request, "INVALID_REFERENCE", 60, trace);
      return response(404, trace, null, { code: "NOT_FOUND", message: "Reference বা PIN সঠিক নয়।" });
    }

    const validPin = await verifyPassword(pin, ticket.tracking_pin_hash);
    if (!validPin) {
      await recordAttempt(db, ticket.id, reference, request, "INVALID_PIN", 60, trace);
      return response(403, trace, null, { code: "INVALID_CREDENTIALS", message: "Reference বা PIN সঠিক নয়।" });
    }

    const [historyResult, messagesResult] = await Promise.all([
      db.prepare(
        `SELECT id,to_status,occurred_at FROM support_status_history
         WHERE ticket_id=? ORDER BY occurred_at,id`,
      ).bind(ticket.id).all<HistoryRow>(),
      db.prepare(
        `SELECT id,body_private,created_at FROM support_messages
         WHERE ticket_id=? AND visibility='PUBLIC_REPLY' ORDER BY created_at,id`,
      ).bind(ticket.id).all<MessageRow>(),
    ]);

    await recordAttempt(db, ticket.id, reference, request, "SUCCESS", null, trace);
    return response(200, trace, safeTicket(ticket, historyResult.results, messagesResult.results));
  } catch {
    return response(500, trace, null, { code: "INTERNAL_FAILURE", message: "টিকিটের অবস্থা এখন দেখা যাচ্ছে না।" });
  }
}

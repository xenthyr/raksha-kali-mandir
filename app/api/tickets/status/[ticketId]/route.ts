import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/files/auth/session";
import { findUserById, getUserPermissions } from "../../../../../lib/files/auth/repository";
import { hashOpaqueToken, verifyPassword } from "../../../../../lib/files/auth/crypto";
import type { AuthDatabase, AuthSessionStore } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8192;
const MAX_FAILURES_PER_CLIENT = 5;
const WINDOW_MINUTES = 15;
const ALLOWED_STATUSES = new Set(["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "REJECTED", "CLOSED"]);
const PUBLIC_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; SESSION_COOKIE_NAME?: string };
type Body = {
  reference?: unknown;
  pin?: unknown;
  status?: unknown;
  expectedVersion?: unknown;
  reasonCode?: unknown;
};
type PublicTicketRow = { id: string; public_reference: string; category_code: string; subject: string; status: string; priority: string; tracking_pin_hash: string; created_at: string; updated_at: string };
type HistoryRow = { id: string; to_status: string; occurred_at: string };
type MessageRow = { id: string; body_private: string; created_at: string };

function traceId(request: Request): string { const value = request.headers.get("x-request-id")?.trim(); return value && value.length <= 128 ? value : crypto.randomUUID(); }
function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }) { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: PUBLIC_HEADERS }); }
function text(value: unknown, max: number): string | null { if (typeof value !== "string") return null; const s = value.trim(); return s && s.length <= max ? s : null; }
function cookie(request: Request, name: string): string | null { const raw = request.headers.get("cookie"); if (!raw) return null; const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = raw.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`)); return match?.[1] ? decodeURIComponent(match[1]) : null; }
async function parseBody(request: Request): Promise<Body | null> { const len = request.headers.get("content-length"); if (len && (!/^\d+$/.test(len) || Number(len) > BODY_LIMIT)) return null; const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return null; try { const parsed: unknown = JSON.parse(raw); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Body : null; } catch { return null; } }
function publicStatus(status: string): string { switch (status) { case "IN_PROGRESS": case "WAITING_USER": return "প্রক্রিয়াধীন"; case "RESOLVED": case "CLOSED": return "মীমাংসিত"; default: return "পর্যালোচনাধীন"; } }
function clientAddress(request: Request): string { return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
async function rateLimited(db: AuthDatabase, request: Request): Promise<boolean> {
  const ipHash=await hashOpaqueToken(clientAddress(request));
  const fingerprint=await hashOpaqueToken([request.headers.get("user-agent")??"",request.headers.get("accept-language")??""].join("|"));
  const row=await db.prepare(`SELECT COUNT(*) AS count FROM support_tracking_attempts WHERE (ip_hash=? OR client_fingerprint_hash=?) AND outcome IN ('INVALID_REFERENCE','INVALID_PIN','RATE_LIMITED','DENIED') AND attempted_at >= datetime('now', ?)`).bind(ipHash,fingerprint,`-${WINDOW_MINUTES} minutes`).first<{count:number}>();
  return Number(row?.count??0)>=MAX_FAILURES_PER_CLIENT;
}
async function recordAttempt(db: AuthDatabase, ticketId: string|null, reference: string, request: Request, outcome: string, trace: string): Promise<void> {
  const ipHash=await hashOpaqueToken(clientAddress(request));
  const fingerprint=await hashOpaqueToken([request.headers.get("user-agent")??"",request.headers.get("accept-language")??""].join("|"));
  await db.prepare(`INSERT INTO support_tracking_attempts(id,ticket_id,attempted_reference,client_fingerprint_hash,ip_hash,outcome,attempted_at,retry_after_seconds,metadata_json) VALUES(?,?,?,?,?,?,CURRENT_TIMESTAMP,?,?)`).bind(crypto.randomUUID(),ticketId,reference,fingerprint,ipHash,outcome,outcome==='RATE_LIMITED'?900:60,JSON.stringify({traceId:trace})).run();
}
function safeTicket(ticket: PublicTicketRow, history: HistoryRow[], messages: MessageRow[]) { return { ticketId: ticket.id, publicReference: ticket.public_reference, category: ticket.category_code, subject: ticket.subject, status: publicStatus(ticket.status), statusCode: ticket.status, createdAt: ticket.created_at, updatedAt: ticket.updated_at, history: history.map((x) => ({ id: x.id, status: publicStatus(x.to_status), statusCode: x.to_status, occurredAt: x.occurred_at })), replies: messages.map((x) => ({ id: x.id, body: x.body_private, createdAt: x.created_at })) }; }
async function authorizeStaff(env: Env, request: Request, trace: string): Promise<{ userId: string } | NextResponse> {
  if (!env.DB || !env.SESSION_STORE) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "প্রশাসনিক সেশন ব্যবস্থা এখন প্রস্তুত নয়।" });
  const token = cookie(request, env.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session");
  if (!token) return out(401, trace, null, { code: "SESSION_INVALID", message: "প্রশাসনিক লগইন প্রয়োজন।" });
  const session = await getSession(env.DB, env.SESSION_STORE, token);
  if (!session) return out(401, trace, null, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" });
  const user = await findUserById(env.DB, session.userId);
  if (!user || user.status !== "ACTIVE" || !user.personId) return out(403, trace, null, { code: "FORBIDDEN", message: "এই টিকিটের status পরিবর্তনের অনুমতি নেই।" });
  const permissions = await getUserPermissions(env.DB, user.id);
  if (!permissions.some((item) => item.code === "support.status.update" || item.code === "support.resolve" || item.code === "committee.manage")) return out(403, trace, null, { code: "FORBIDDEN", message: "এই টিকিটের status পরিবর্তনের অনুমতি নেই।" });
  return { userId: user.id };
}

async function readPublic(db: AuthDatabase, ticketId: string, reference: string, pin: string, trace: string, request: Request): Promise<NextResponse> {
  if (await rateLimited(db,request)) { await recordAttempt(db,null,reference,request,"RATE_LIMITED",trace); return out(429,trace,null,{code:"RATE_LIMITED",message:"অনেকবার ভুল চেষ্টা হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন।"}); }
  const ticket = await db.prepare(`SELECT id,public_reference,category_code,subject,status,priority,tracking_pin_hash,created_at,updated_at FROM support_tickets WHERE id=? AND public_reference=? LIMIT 1`).bind(ticketId, reference).first<PublicTicketRow>();
  if (!ticket) { await recordAttempt(db,null,reference,request,"INVALID_REFERENCE",trace); return out(404, trace, null, { code: "NOT_FOUND", message: "Reference বা PIN সঠিক নয়।" }); }
  if (!(await verifyPassword(pin, ticket.tracking_pin_hash))) { await recordAttempt(db,ticket.id,reference,request,"INVALID_PIN",trace); return out(403, trace, null, { code: "INVALID_CREDENTIALS", message: "Reference বা PIN সঠিক নয়।" }); }
  const [history, messages] = await Promise.all([
    db.prepare(`SELECT id,to_status,occurred_at FROM support_status_history WHERE ticket_id=? ORDER BY occurred_at,id`).bind(ticketId).all<HistoryRow>(),
    db.prepare(`SELECT id,body_private,created_at FROM support_messages WHERE ticket_id=? AND visibility='PUBLIC_REPLY' ORDER BY created_at,id`).bind(ticketId).all<MessageRow>(),
  ]);
  return out(200, trace, safeTicket(ticket, history.results, messages.results));
}

export async function GET(request: Request, context: { params: Promise<{ ticketId: string }> }): Promise<NextResponse> {
  const trace = traceId(request);
  const runtime = getCloudflareContext().env as unknown as Env;
  if (!runtime.DB) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "টিকিট ব্যবস্থা এখন প্রস্তুত নয়।" });
  const { ticketId } = await context.params;
  const url = new URL(request.url);
  const reference = text(url.searchParams.get("reference"), 20)?.toUpperCase();
  const pin = text(url.searchParams.get("pin"), 4);
  if (!ticketId || !reference || !/^MRK-[0-9]{4}-[0-9]{6}$/.test(reference) || !pin || !/^\d{4}$/.test(pin)) return out(400, trace, null, { code: "TRACKING_CREDENTIALS_REQUIRED", message: "Reference এবং ৪-সংখ্যার PIN দুটিই প্রয়োজন।" });
  try { return await readPublic(runtime.DB, ticketId, reference, pin, trace, request); } catch { return out(500, trace, null, { code: "INTERNAL_FAILURE", message: "টিকিটের অবস্থা এখন দেখা যাচ্ছে না।" }); }
}

export async function POST(request: Request, context: { params: Promise<{ ticketId: string }> }): Promise<NextResponse> {
  const trace = traceId(request);
  const runtime = getCloudflareContext().env as unknown as Env;
  if (!runtime.DB) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "টিকিট ব্যবস্থা এখন প্রস্তুত নয়।" });
  const { ticketId } = await context.params;
  if (!ticketId) return out(400, trace, null, { code: "INVALID_INPUT", message: "Ticket ID প্রয়োজন।" });
  const staff = await authorizeStaff(runtime, request, trace);
  if (staff instanceof NextResponse) return staff;
  const body = await parseBody(request);
  const nextStatus = text(body?.status, 32)?.toUpperCase() ?? null;
  const expectedVersion = typeof body?.expectedVersion === "number" && Number.isSafeInteger(body.expectedVersion) ? body.expectedVersion : null;
  const reasonCode = text(body?.reasonCode ?? "STATUS_UPDATED", 64) || "STATUS_UPDATED";
  if (!body || !nextStatus || !ALLOWED_STATUSES.has(nextStatus) || expectedVersion === null || expectedVersion < 1) return out(400, trace, null, { code: "INVALID_INPUT", message: "Status update-এর তথ্য সঠিক নয়।" });

  try {
    const ticket = await runtime.DB.prepare(`SELECT id,status,version FROM support_tickets WHERE id=? LIMIT 1`).bind(ticketId).first<{ id: string; status: string; version: number }>();
    if (!ticket) return out(404, trace, null, { code: "NOT_FOUND", message: "টিকিট পাওয়া যায়নি।" });
    if (ticket.version !== expectedVersion) return out(409, trace, null, { code: "STALE_VERSION", message: "টিকিটটি অন্য প্রক্রিয়ায় পরিবর্তিত হয়েছে। আবার পড়ে চেষ্টা করুন।" });
    if (ticket.status === nextStatus) return out(409, trace, null, { code: "NO_STATE_CHANGE", message: "টিকিটের status ইতিমধ্যেই একই আছে।" });
    if ((nextStatus === "RESOLVED" || nextStatus === "CLOSED") && !["OPEN", "IN_PROGRESS", "WAITING_USER", "RESOLVED", "CLOSED"].includes(ticket.status)) return out(409, trace, null, { code: "INVALID_STATE", message: "এই status transition অনুমোদিত নয়।" });
    const now = new Date().toISOString();
    const historyId = crypto.randomUUID();
    const revisionId = crypto.randomUUID();
    const idemHash = await hashOpaqueToken(`${ticketId}:${expectedVersion}:${nextStatus}:${reasonCode}`);
    const statusUpdate = runtime.DB.prepare(
      `UPDATE support_tickets SET status=?,version=version+1,updated_at=?,resolved_at=CASE WHEN ? IN ('RESOLVED','CLOSED') THEN COALESCE(resolved_at,?) ELSE resolved_at END,closed_at=CASE WHEN ?='CLOSED' THEN COALESCE(closed_at,?) ELSE closed_at END WHERE id=? AND version=?`,
    ).bind(nextStatus, now, nextStatus, now, nextStatus, now, ticketId, expectedVersion);
    const historyInsert = runtime.DB.prepare(
      `INSERT INTO support_status_history(id,ticket_id,from_status,to_status,actor_user_id,actor_role,reason_code,note_private,occurred_at,idempotency_key_hash,revision_id) VALUES(?,?,?,?,?,'STAFF',?,?,?, ?,?)`,
    ).bind(historyId, ticketId, ticket.status, nextStatus, staff.userId, reasonCode, null, now, idemHash, revisionId);
    const auditInsert = runtime.DB.prepare(
      `INSERT INTO support_audit_events(id,ticket_id,actor_user_id,actor_role,action,entity_type,entity_id,before_json,after_json,reason_code,occurred_at,idempotency_key_hash,metadata_json) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(idempotency_key_hash) DO NOTHING`,
    ).bind(crypto.randomUUID(), ticketId, staff.userId, "STAFF", "STATUS_UPDATED", "SupportTicket", ticketId, JSON.stringify({ status: ticket.status, version: expectedVersion }), JSON.stringify({ status: nextStatus, version: expectedVersion + 1 }), reasonCode, now, idemHash, JSON.stringify({ traceId: trace }));

    const results = await runtime.DB.batch([statusUpdate, historyInsert, auditInsert]);
    if (Number((results?.[0] as { meta?: { changes?: number } } | undefined)?.meta?.changes ?? 0) !== 1) return out(409, trace, null, { code: "CONFLICT", message: "টিকিটের status পরিবর্তন করা যায়নি; টিকিটটি আবার পড়ুন।" });
    return out(200, trace, { ticketId, statusCode: nextStatus, status: publicStatus(nextStatus), version: expectedVersion + 1 });
  } catch { return out(500, trace, null, { code: "INTERNAL_FAILURE", message: "টিকিটের status এখন পরিবর্তন করা যাচ্ছে না।" }); }
}

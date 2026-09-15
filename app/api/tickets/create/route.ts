import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken, hashPassword } from "../../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 16384;
const MAX_NAME = 160;
const MAX_EMAIL = 254;
const MAX_SUBJECT = 240;
const MAX_MESSAGE = 20000;
const CATEGORIES = new Set(["FINANCE", "PUJA", "GRIEVANCE", "GENERAL"]);
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type RuntimeEnv = { DB?: AuthDatabase; TURNSTILE_SECRET_KEY?: string; ENVIRONMENT?: "production" | "preview" };
type Body = {
  name?: unknown;
  email?: unknown;
  category?: unknown;
  subject?: unknown;
  message?: unknown;
  turnstileToken?: unknown;
  attachmentIds?: unknown;
};
type ExistingIdempotency = {
  id: string;
  request_hash: string;
  ticket_id: string | null;
  response_status_code: number | null;
  response_body_opaque: string | null;
  state: string;
};
type CategoryRow = { id: string; code: string; routing_queue_code: string; enabled: number };
type EmailTemplateRow = { id: string; version: number; subject_template: string; body_template_private: string };
type SenderRow = { id: string; from_address_private: string; reply_to_address_private: string | null };

function env(): RuntimeEnv {
  return getCloudflareContext().env as unknown as RuntimeEnv;
}

function traceId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS });
}

async function parseBody(request: Request): Promise<Body | null> {
  const len = request.headers.get("content-length");
  if (len && (!/^\d+$/.test(len) || Number(len) > BODY_LIMIT)) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Body : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= MAX_EMAIL;
}

function currentGregorianYearIST(): string {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", year: "numeric" }).formatToParts(new Date());
  return parts.find((part) => part.type === "year")?.value ?? String(new Date().getUTCFullYear());
}

function randomDigits(count: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(count));
  return Array.from(bytes, (b) => String(b % 10)).join("");
}

async function turnstileOk(token: string, request: Request, secret: string): Promise<boolean> {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  const ip = request.headers.get("cf-connecting-ip");
  if (ip) body.set("remoteip", ip);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
  if (!response.ok) return false;
  const payload = await response.json() as { success?: boolean };
  return payload.success === true;
}

function renderTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g, (_match, key: string) => values[key] ?? "");
}

function safeTicketResponse(reference: string, pin: string, id: string) {
  return {
    ticketId: id,
    publicReference: reference,
    trackingPin: pin,
    status: "OPEN",
    acknowledgement: "এই Reference ও ৪-সংখ্যার PIN নিরাপদে রাখুন। Ticket tracking-এ দুটিই লাগবে।",
  };
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const runtime = env();
  const db = runtime.DB;
  if (!db) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "সহায়তা ব্যবস্থা এখন প্রস্তুত নয়। পরে আবার চেষ্টা করুন।" });

  const body = await parseBody(request);
  const name = body ? text(body.name, MAX_NAME) : null;
  const emailRaw = body ? text(body.email, MAX_EMAIL) : null;
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  const category = body ? text(body.category, 32)?.toUpperCase() : null;
  const subject = body ? text(body.subject, MAX_SUBJECT) : null;
  const message = body ? text(body.message, MAX_MESSAGE) : null;
  const turnstileToken = body ? text(body.turnstileToken, 4096) : null;
  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || null;

  if (!body || !name || !email || !validEmail(email) || !category || !CATEGORIES.has(category) || !subject || !message || !turnstileToken) {
    return out(400, trace, null, { code: "INVALID_INPUT", message: "নাম, ইমেল, বিভাগ, বিষয়, বার্তা এবং নিরাপত্তা যাচাই সঠিকভাবে দিতে হবে।" });
  }
  if (!idempotencyKey || idempotencyKey.length < 16 || idempotencyKey.length > 200) {
    return out(400, trace, null, { code: "IDEMPOTENCY_KEY_REQUIRED", message: "অনুরোধটি নিরাপদে পুনরাবৃত্তি করতে Idempotency-Key প্রয়োজন।" });
  }

  try {
    if (!runtime.TURNSTILE_SECRET_KEY) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "নিরাপত্তা যাচাই ব্যবস্থা এখন প্রস্তুত নয়।" });
    if (!(await turnstileOk(turnstileToken, request, runtime.TURNSTILE_SECRET_KEY))) {
      return out(403, trace, null, { code: "TURNSTILE_REJECTED", message: "নিরাপত্তা যাচাই সম্পন্ন হয়নি। আবার চেষ্টা করুন।" });
    }

    const requestHash = await hashOpaqueToken(JSON.stringify({ name, email, category, subject, message }));
    const keyHash = await hashOpaqueToken(idempotencyKey);
    const existing = await db.prepare(
      `SELECT id,request_hash,ticket_id,response_status_code,response_body_opaque,state
       FROM support_idempotency_records WHERE idempotency_key_hash=? LIMIT 1`,
    ).bind(keyHash).first<ExistingIdempotency>();

    if (existing) {
      if (existing.request_hash !== requestHash) return out(409, trace, null, { code: "IDEMPOTENCY_CONFLICT", message: "এই Idempotency-Key অন্য একটি অনুরোধের সঙ্গে যুক্ত।" });
      if (existing.state === "COMPLETED" && existing.response_body_opaque && existing.response_status_code) {
        try {
          return new NextResponse(existing.response_body_opaque, { status: existing.response_status_code, headers: HEADERS });
        } catch {
          return out(503, trace, null, { code: "IDEMPOTENCY_RESULT_INVALID", message: "পূর্ববর্তী ফলাফল নির্ভরযোগ্যভাবে পুনরুদ্ধার করা যায়নি।" });
        }
      }
      if (existing.state === "RESERVED") return out(409, trace, null, { code: "REQUEST_IN_PROGRESS", message: "এই অনুরোধটি ইতিমধ্যে প্রক্রিয়াধীন।" });
    }

    if (!existing) {
      await db.prepare(
        `INSERT INTO support_idempotency_records(id,operation_type,idempotency_key_hash,request_hash,state,created_at,updated_at)
         VALUES(?,?,?,?,'RESERVED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      ).bind(crypto.randomUUID(), "CREATE_TICKET", keyHash, requestHash).run();
    }

    const categoryRow = await db.prepare(
      `SELECT id,code,routing_queue_code,enabled FROM support_categories WHERE code=? AND enabled=1 LIMIT 1`,
    ).bind(category).first<CategoryRow>();
    if (!categoryRow) {
      await db.prepare(`UPDATE support_idempotency_records SET state='FAILED',updated_at=CURRENT_TIMESTAMP WHERE idempotency_key_hash=?`).bind(keyHash).run();
      return out(409, trace, null, { code: "CATEGORY_UNAVAILABLE", message: "নির্বাচিত সহায়তা বিভাগটি এখন সক্রিয় নেই।" });
    }

    const ticketId = crypto.randomUUID();
    const publicReference = `MRK-${currentGregorianYearIST()}-${randomDigits(6)}`;
    const trackingPin = randomDigits(4);
    const pinHash = await hashPassword(trackingPin);

    const template = await db.prepare(
      `SELECT id,version,subject_template,body_template_private
       FROM email_templates WHERE purpose='TICKET_ACKNOWLEDGEMENT' AND locale IN ('bn-IN','bn') AND enabled=1
       ORDER BY CASE WHEN locale='bn-IN' THEN 0 ELSE 1 END,version DESC LIMIT 1`,
    ).bind().first<EmailTemplateRow>();
    const sender = await db.prepare(
      `SELECT id,from_address_private,reply_to_address_private
       FROM email_sender_profiles WHERE environment_scope=? AND enabled=1 AND provider_verified=1 AND verification_status='VERIFIED' LIMIT 1`,
    ).bind(runtime.ENVIRONMENT === "preview" ? "PREVIEW" : "PRODUCTION").first<SenderRow>();

    const logicalKeyHash = await hashOpaqueToken(`TICKET_ACKNOWLEDGEMENT:${ticketId}:${email}`);
    const dispatchId = template && sender ? crypto.randomUUID() : null;
    const dispatchKeyHash = template && sender ? await hashOpaqueToken(`DISPATCH:${ticketId}:${email}`) : null;
    const subjectRendered = template ? renderTemplate(template.subject_template, { publicReference }) : null;
    const bodyRendered = template ? renderTemplate(template.body_template_private, { publicReference, trackingPin, name }) : null;

    const statements = [
      db.prepare(
        `INSERT INTO support_tickets(id,public_reference,requester_name,requester_email_private,category_id,category_code,subject,message,tracking_pin_hash,tracking_pin_kdf_version,status,priority,noindex_required,turnstile_verified,turnstile_verification_id,created_at,updated_at,version)
         VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,1,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,1)`,
      ).bind(ticketId, publicReference, name, email, categoryRow.id, categoryRow.code, subject, message, pinHash, "PBKDF2-SHA256-V1-600K", "OPEN", "NORMAL", crypto.randomUUID()),
      db.prepare(
        `INSERT INTO support_status_history(id,ticket_id,from_status,to_status,actor_user_id,actor_role,reason_code,note_private,idempotency_key_hash,revision_id)
         VALUES(?,?,NULL,'OPEN',NULL,'SYSTEM','TICKET_CREATED',NULL,?,?)`,
      ).bind(crypto.randomUUID(), ticketId, keyHash, crypto.randomUUID()),
      db.prepare(
        `INSERT INTO support_audit_events(id,ticket_id,actor_user_id,actor_role,action,entity_type,entity_id,before_json,after_json,reason_code,idempotency_key_hash,metadata_json)
         VALUES(?,?,NULL,'SYSTEM','CREATE','SupportTicket',?,NULL,?,?,?,?)`,
      ).bind(crypto.randomUUID(), ticketId, JSON.stringify({ status: "OPEN", categoryCode: categoryRow.code, routingQueueCode: categoryRow.routing_queue_code }), "TICKET_CREATED", keyHash, JSON.stringify({ traceId: trace, turnstileVerified: true })),
      db.prepare(
        `UPDATE support_idempotency_records SET ticket_id=?,state='COMPLETED',response_status_code=?,response_body_opaque=?,completed_at=CURRENT_TIMESTAMP,updated_at=CURRENT_TIMESTAMP WHERE idempotency_key_hash=? AND state='RESERVED'`,
      ).bind(ticketId, 201, JSON.stringify({ ok: true, data: safeTicketResponse(publicReference, trackingPin, ticketId), meta: { traceId, acknowledgementQueued: Boolean(dispatchId) } }), keyHash),
    ];

    if (dispatchId && dispatchKeyHash && template && sender && subjectRendered && bodyRendered) {
      statements.splice(3, 0, db.prepare(
        `INSERT INTO email_dispatches(id,logical_notification_key_hash,idempotency_key_hash,ticket_id,destination_id,sender_profile_id,template_id,template_version,provider_code,recipient_address_private,recipient_address_normalized,subject_private,body_private,environment_scope,status,queued_at,created_at,updated_at)
         VALUES(?,?,?,?,NULL,?,?,?,'RESEND',?,?,?,?,?,'QUEUED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`,
      ).bind(dispatchId, logicalKeyHash, dispatchKeyHash, ticketId, sender.id, template.id, template.version, email, email, subjectRendered, bodyRendered, runtime.ENVIRONMENT === "preview" ? "PREVIEW" : "PRODUCTION"));
    }

    const result = await db.batch(statements);
    const idempotencyResult = result[result.length - 1] as { meta?: { changes?: number } };
    if ((idempotencyResult?.meta?.changes ?? 0) !== 1) return out(409, trace, null, { code: "WRITE_CONFLICT", message: "অনুরোধটি অন্য একটি প্রক্রিয়া সম্পন্ন করেছে। আবার tracking ফলাফল দেখুন।" });

    const responseBody = JSON.stringify({ ok: true, data: safeTicketResponse(publicReference, trackingPin, ticketId), meta: { traceId: trace, acknowledgementQueued: Boolean(dispatchId) } });
    await db.prepare(`UPDATE support_idempotency_records SET response_body_opaque=?,response_status_code=201,updated_at=CURRENT_TIMESTAMP WHERE ticket_id=? AND idempotency_key_hash=?`).bind(responseBody, ticketId, keyHash).run();
    return new NextResponse(responseBody, { status: 201, headers: HEADERS });
  } catch (error) {
    if (error instanceof Error && /UNIQUE|constraint/i.test(error.message)) {
      return out(409, trace, null, { code: "CONFLICT", message: "অনুরোধটি ইতিমধ্যে গ্রহণ করা হয়েছে বা একটি অনন্যতা সংঘাত হয়েছে।" });
    }
    return out(500, trace, null, { code: "INTERNAL_FAILURE", message: "সহায়তার অনুরোধ এখন সম্পন্ন করা যাচ্ছে না।" });
  }
}

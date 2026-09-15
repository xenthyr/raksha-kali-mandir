import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Resend } from "resend";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "../../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 262144;
const RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};
const EVENT_TYPES = new Set(["email.queued", "email.sent", "email.delivered", "email.failed", "email.bounced", "email.complained", "email.opened", "email.clicked"]);

type Env = { DB?: AuthDatabase; RESEND_WEBHOOK_SECRET?: string; RESEND_API_KEY?: string };
type ResendEvent = { type?: unknown; created_at?: unknown; data?: unknown };
type EventData = { email_id?: unknown; created_at?: unknown; to?: unknown; tags?: unknown };
type DispatchRow = { id: string; status: string; provider_message_id: string | null; provider_last_event_at: string | null; environment_scope: string };

function traceId(request: Request): string { const value = request.headers.get("x-request-id")?.trim(); return value && value.length <= 128 ? value : crypto.randomUUID(); }
function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }) { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: RESPONSE_HEADERS }); }
function stringValue(value: unknown, max: number): string | null { if (typeof value !== "string") return null; const s = value.trim(); return s && s.length <= max ? s : null; }
function eventToState(type: string): string | null { switch (type) { case "email.queued": return "QUEUED"; case "email.sent": return "SENT"; case "email.delivered": return "DELIVERED"; case "email.failed": return "FAILED"; case "email.bounced": return "BOUNCED"; case "email.complained": return "COMPLAINT"; case "email.opened": return "OPENED"; case "email.clicked": return "CLICKED"; default: return null; } }
function stateRank(status: string): number { switch (status) { case "QUEUED": return 10; case "SENT": return 20; case "DELIVERED": return 30; case "OPENED": return 40; case "CLICKED": return 50; case "FAILED": case "BOUNCED": case "COMPLAINT": return 60; default: return 0; } }

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const runtime = getCloudflareContext().env as unknown as Env;
  if (!runtime.DB) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "ইমেল event ব্যবস্থা এখন প্রস্তুত নয়।" });
  if (!runtime.RESEND_WEBHOOK_SECRET) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "ইমেল webhook নিরাপত্তা কনফিগার করা হয়নি।" });

  const contentLength = request.headers.get("content-length");
  if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_BODY_BYTES)) return out(413, trace, null, { code: "PAYLOAD_TOO_LARGE", message: "Webhook payload অতিরিক্ত বড়।" });
  const payload = await request.text();
  if (new TextEncoder().encode(payload).byteLength > MAX_BODY_BYTES) return out(413, trace, null, { code: "PAYLOAD_TOO_LARGE", message: "Webhook payload অতিরিক্ত বড়।" });

  try {
    const resend = new Resend(runtime.RESEND_API_KEY ?? "");
    const verified = resend.webhooks.verify({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret: runtime.RESEND_WEBHOOK_SECRET,
    }) as unknown as ResendEvent;

    const type = stringValue(verified.type, 64);
    const data = verified.data && typeof verified.data === "object" && !Array.isArray(verified.data) ? verified.data as EventData : null;
    const providerMessageId = data ? stringValue(data.email_id, 128) : null;
    const occurredAt = stringValue(verified.created_at, 64) ?? new Date().toISOString();
    const occurredAtMs = Date.parse(occurredAt);
    if (!Number.isFinite(occurredAtMs)) return out(400, trace, null, { code: "INVALID_WEBHOOK", message: "Webhook event-টি গ্রহণযোগ্য নয়।" });
    if (!type || !EVENT_TYPES.has(type) || !providerMessageId) return out(400, trace, null, { code: "INVALID_WEBHOOK", message: "Webhook event-টি গ্রহণযোগ্য নয়।" });

    const eventType = eventToState(type);
    if (!eventType) return out(400, trace, null, { code: "UNSUPPORTED_EVENT", message: "Webhook event-টি সমর্থিত নয়।" });
    const payloadHash = await sha256Hex(payload);
    const providerEventId = stringValue(request.headers.get("svix-id"), 128) ?? crypto.randomUUID();

    const existingEvent = await runtime.DB.prepare(`SELECT id FROM email_events WHERE provider_event_id=? LIMIT 1`).bind(providerEventId).first<{ id: string }>();
    if (existingEvent) return out(200, trace, { accepted: true, duplicate: true, providerEventId });

    const dispatch = await runtime.DB.prepare(
      `SELECT id,status,provider_message_id,provider_last_event_at,environment_scope
       FROM email_dispatches WHERE provider_message_id=? LIMIT 1`,
    ).bind(providerMessageId).first<DispatchRow>();

    if (!dispatch) return out(409, trace, null, { code: "UNKNOWN_PROVIDER_MESSAGE", message: "Webhook-টি পরিচিত ইমেল dispatch-এর সঙ্গে মিলছে না।" });

    const eventId = crypto.randomUUID();
    const metadata = JSON.stringify({ traceId: trace, provider: "RESEND", eventType: type });
    await runtime.DB.prepare(
      `INSERT INTO email_events
        (id,dispatch_id,provider_code,provider_event_id,provider_message_id,event_type,event_occurred_at,received_at,authenticity_status,signature_scheme,signature_fingerprint_hash,payload_hash,raw_payload_opaque,metadata_json)
       VALUES(?,?,?,?,?,?,?,CURRENT_TIMESTAMP,'VERIFIED','SVIX',NULL,?,?,?)`,
    ).bind(eventId, dispatch.id, "RESEND", providerEventId, providerMessageId, eventType, occurredAt, payloadHash, payload, metadata).run();

    const incomingRank = stateRank(eventType);
    const currentRank = stateRank(dispatch.status);
    const recordedAtMs = dispatch.provider_last_event_at ? Date.parse(dispatch.provider_last_event_at) : Number.NaN;
    const isNewerThanRecorded = !Number.isFinite(recordedAtMs) || occurredAtMs >= recordedAtMs;
    let nextStatus = dispatch.status;
    if (isNewerThanRecorded && incomingRank >= currentRank) nextStatus = eventType;
    if (["OPENED", "CLICKED"].includes(nextStatus) && !["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(dispatch.status) && !isNewerThanRecorded) nextStatus = dispatch.status;

    const sentAt = ["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(eventType) ? occurredAt : null;
    const deliveredAt = eventType === "DELIVERED" ? occurredAt : null;
    const failedAt = eventType === "FAILED" ? occurredAt : null;
    const bouncedAt = eventType === "BOUNCED" ? occurredAt : null;
    const complainedAt = eventType === "COMPLAINT" ? occurredAt : null;
    const openedAt = eventType === "OPENED" ? occurredAt : null;
    const clickedAt = eventType === "CLICKED" ? occurredAt : null;

    await runtime.DB.prepare(
      `UPDATE email_dispatches
       SET provider_message_id=COALESCE(provider_message_id,?),
           provider_last_event_at=CASE WHEN provider_last_event_at IS NULL OR ? >= provider_last_event_at THEN ? ELSE provider_last_event_at END,
           status=?,
           sent_at=COALESCE(sent_at,?),
           delivered_at=COALESCE(delivered_at,?),
           failed_at=COALESCE(failed_at,?),
           bounced_at=COALESCE(bounced_at,?),
           complained_at=COALESCE(complained_at,?),
           opened_at=COALESCE(opened_at,?),
           clicked_at=COALESCE(clicked_at,?),
           updated_at=CURRENT_TIMESTAMP
       WHERE id=?`,
    ).bind(providerMessageId, occurredAt, occurredAt, nextStatus, sentAt, deliveredAt, failedAt, bouncedAt, complainedAt, openedAt, clickedAt, dispatch.id).run();

    return out(200, trace, { accepted: true, correlated: true, providerEventId, dispatchId: dispatch.id, status: nextStatus });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("Invalid signature") || message.includes("signature") || message.includes("timestamp")) {
      return out(401, trace, null, { code: "INVALID_WEBHOOK", message: "Webhook যাচাই করা যায়নি।" });
    }
    return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "ইমেল event এখন সংরক্ষণ করা যাচ্ছে না।" });
  }
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

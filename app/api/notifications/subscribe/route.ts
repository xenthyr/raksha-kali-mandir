import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_BODY = 16 * 1024;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase };
type Body = {
  endpoint?: unknown;
  p256dh?: unknown;
  auth?: unknown;
  anonymousInstallationId?: unknown;
  browserFamily?: unknown;
  locale?: unknown;
  permissionStatus?: unknown;
  enabled?: unknown;
  preferences?: unknown;
};
type Preferences = Partial<Record<"amavasya" | "specialPuja" | "festival" | "notice" | "live" | "volunteer" | "emergency", unknown>>;
type Existing = { id: string; endpoint_hash: string; enabled: number; permission_status: string; version: number };

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function out(status: number, traceIdValue: string, data: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(
    error ? { ok: false, error, meta: { traceId: traceIdValue } } : { ok: true, data, meta: { traceId: traceIdValue } },
    { status, headers: HEADERS },
  );
}

async function parseBody(request: Request): Promise<Body | null> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > MAX_BODY)) return null;
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
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

function boolPreference(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function validHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.username === "" && url.password === "";
  } catch {
    return false;
  }
}

function validBase64Url(value: string, expectedBytes: number): boolean {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return false;
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  try {
    return atob(normalized).length === expectedBytes;
  } catch {
    return false;
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  if (!env.DB) return out(503, trace, null, { code: "DEPENDENCY_FAILURE", message: "নোটিফিকেশন সাবস্ক্রিপশন ব্যবস্থা এখন প্রস্তুত নয়।" });

  const body = await parseBody(request);
  const endpoint = text(body?.endpoint, 4096);
  const p256dh = text(body?.p256dh, 256);
  const auth = text(body?.auth, 256);
  const installationId = text(body?.anonymousInstallationId, 256);
  const browserFamily = text(body?.browserFamily, 64);
  const locale = text(body?.locale, 16);
  const permissionStatus = text(body?.permissionStatus ?? "GRANTED", 16)?.toUpperCase() ?? null;
  const preferences = body?.preferences && typeof body.preferences === "object" && !Array.isArray(body.preferences)
    ? body.preferences as Preferences
    : {};

  if (!body || !endpoint || !p256dh || !auth || !validHttpsUrl(endpoint) || !validBase64Url(p256dh, 65) || !validBase64Url(auth, 16)) {
    return out(400, trace, null, { code: "INVALID_SUBSCRIPTION", message: "Push subscription-এর তথ্য সঠিক নয়।" });
  }
  if (permissionStatus !== "GRANTED" && permissionStatus !== "DENIED" && permissionStatus !== "PROMPT" && permissionStatus !== "REVOKED") {
    return out(400, trace, null, { code: "INVALID_PERMISSION_STATUS", message: "Permission status সঠিক নয়।" });
  }
  if (!installationId) {
    return out(400, trace, null, { code: "INSTALLATION_ID_REQUIRED", message: "Anonymous installation identifier দিতে হবে।" });
  }

  try {
    const endpointHash = await hashOpaqueToken(endpoint);
    const existing = await env.DB.prepare(
      `SELECT id, endpoint_hash, enabled, permission_status, version
       FROM notification_subscriptions WHERE endpoint_hash=? LIMIT 1`,
    ).bind(endpointHash).first<Existing>();

    const values = {
      amavasya: boolPreference(preferences.amavasya, true),
      specialPuja: boolPreference(preferences.specialPuja, true),
      festival: boolPreference(preferences.festival, true),
      notice: boolPreference(preferences.notice, true),
      live: boolPreference(preferences.live, true),
      volunteer: boolPreference(preferences.volunteer, true),
      emergency: boolPreference(preferences.emergency, true),
    };
    const enabled = permissionStatus === "GRANTED" && body.enabled !== false;
    const now = new Date().toISOString();

    if (existing) {
      const result = await env.DB.prepare(
        `UPDATE notification_subscriptions
         SET endpoint_opaque=?, p256dh_opaque=?, auth_opaque=?, anonymous_installation_id=?,
             browser_family=?, locale=?, permission_status=?, enabled=?,
             amavasya_enabled=?, special_puja_enabled=?, festival_enabled=?, notice_enabled=?,
             live_enabled=?, volunteer_enabled=?, emergency_enabled=?,
             revoked_at=CASE WHEN ? IN ('REVOKED','DENIED') THEN ? ELSE NULL END,
             last_seen_at=?, version=version+1, updated_at=?
         WHERE id=? AND endpoint_hash=? AND version=?`,
      ).bind(
        endpoint, p256dh, auth, installationId, browserFamily, locale, permissionStatus, enabled ? 1 : 0,
        values.amavasya ? 1 : 0, values.specialPuja ? 1 : 0, values.festival ? 1 : 0, values.notice ? 1 : 0,
        values.live ? 1 : 0, values.volunteer ? 1 : 0, values.emergency ? 1 : 0,
        permissionStatus, now, now, now, existing.id, endpointHash, existing.version,
      ).run();
      if ((result.meta?.changes ?? 0) !== 1) return out(409, trace, null, { code: "STALE_SUBSCRIPTION", message: "সাবস্ক্রিপশনটি একই সময়ে পরিবর্তিত হয়েছে। আবার চেষ্টা করুন।" });
      return out(200, trace, { subscriptionId: existing.id, status: permissionStatus, enabled });
    }

    if (permissionStatus !== "GRANTED" || !enabled) return out(400, trace, null, { code: "OPT_IN_REQUIRED", message: "Push notification-এর জন্য স্পষ্ট opt-in প্রয়োজন।" });

    const id = crypto.randomUUID();
    const result = await env.DB.prepare(
      `INSERT INTO notification_subscriptions
       (id,user_id,anonymous_installation_id,endpoint_hash,endpoint_opaque,p256dh_opaque,auth_opaque,
        browser_family,locale,permission_status,enabled,amavasya_enabled,special_puja_enabled,
        festival_enabled,notice_enabled,live_enabled,volunteer_enabled,emergency_enabled,last_seen_at,
        source_id,revision_id,version,created_at,updated_at)
       VALUES(?,NULL,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL,NULL,1,?,?)`,
    ).bind(
      id, installationId, endpointHash, endpoint, p256dh, auth, browserFamily, locale, permissionStatus, 1,
      values.amavasya ? 1 : 0, values.specialPuja ? 1 : 0, values.festival ? 1 : 0, values.notice ? 1 : 0,
      values.live ? 1 : 0, values.volunteer ? 1 : 0, values.emergency ? 1 : 0, now, now, now,
    ).run();
    if ((result.meta?.changes ?? 0) !== 1) return out(409, trace, null, { code: "SUBSCRIPTION_CONFLICT", message: "এই Push subscription ইতিমধ্যে নিবন্ধিত হয়েছে। আবার চেষ্টা করুন।" });

    return out(201, trace, { subscriptionId: id, status: "GRANTED", enabled: true });
  } catch {
    return out(500, trace, null, { code: "INTERNAL_FAILURE", message: "Push subscription সংরক্ষণ করা যায়নি।" });
  }
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserPermissions, getUserRoles } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";
import { assertSafeObjectKeySegment } from "../../../../lib/files/policy";
import { B2StorageGateway } from "../../../../lib/files/storage";
import type { D1Like } from "../../../../lib/db/client";
import { CANONICAL } from "../../../../lib/config/canonical";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 16_384;
const ID_LIMIT = 128;
const TEXT_LIMIT = 1_000;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

interface Env {
  DB?: AuthDatabase;
  SESSION_STORE?: AuthSessionStore;
  SESSION_COOKIE_NAME?: string;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_S3_ENDPOINT?: string;
  B2_ACCESS_KEY_ID?: string;
  B2_SECRET_ACCESS_KEY?: string;
}

interface Body {
  mediaId?: unknown;
  expectedVersion?: unknown;
  darshanEventId?: unknown;
  albumId?: unknown;
  titleBn?: unknown;
  titleEn?: unknown;
  captionBn?: unknown;
  captionEn?: unknown;
  publicSlug?: unknown;
}

interface MediaRow {
  id: string;
  temple_id: string;
  darshan_event_id: string | null;
  album_id: string | null;
  media_type: string;
  title_bn: string | null;
  title_en: string | null;
  caption_bn: string | null;
  caption_en: string | null;
  bucket_name: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  object_etag: string | null;
  approval_status: string;
  publication_status: string;
  verification_status: string;
  version: number;
}

function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}

function out(status: number, trace: string, data?: unknown, error?: { code: string; message: string }): NextResponse {
  return NextResponse.json(
    error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } },
    { status, headers: HEADERS },
  );
}

function parseCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

async function jsonBody(request: Request): Promise<Body | null> {
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) return null;
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > BODY_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(text);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Body : null;
  } catch {
    return null;
  }
}

function text(value: unknown, max: number, allowEmpty = false): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized && allowEmpty) return "";
  return normalized && normalized.length <= max ? normalized : null;
}

function positiveVersion(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 2_147_483_647) return null;
  return value;
}

async function authorize(env: Env, request: Request): Promise<{ userId: string; roleCode: string } | { error: NextResponse }> {
  if (!env.DB || !env.SESSION_STORE) {
    return { error: out(503, traceId(request), undefined, { code: "DEPENDENCY_FAILURE", message: "মিডিয়া ব্যবস্থাপনা এখন উপলভ্য নয়।" }) };
  }
  const cookieName = env.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session";
  const token = parseCookie(request, cookieName);
  if (!token) return { error: out(401, traceId(request), undefined, { code: "SESSION_INVALID", message: "অনুগ্রহ করে প্রশাসনিক অ্যাকাউন্ট দিয়ে লগইন করুন।" }) };
  const session = await getSession(env.DB, env.SESSION_STORE, token);
  if (!session) return { error: out(401, traceId(request), undefined, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" }) };
  const user = await findUserById(env.DB, session.userId);
  if (!user || user.status !== "ACTIVE" || !user.personId) return { error: out(403, traceId(request), undefined, { code: "FORBIDDEN", message: "এই কাজের অনুমতি নেই।" }) };
  const permissions = await getUserPermissions(env.DB, user.id);
  if (!permissions.some((permission) => permission.code === "media.upload" || permission.code === "media.publish")) {
    return { error: out(403, traceId(request), undefined, { code: "FORBIDDEN", message: "মিডিয়া সম্পাদনার অনুমতি আপনার নেই।" }) };
  }
  const roles = await getUserRoles(env.DB, user.id);
  return { userId: user.id, roleCode: roles[0]?.code ?? "UNKNOWN" };
}

async function writeAudit(db: D1Like, actorUserId: string, actorRoleCode: string, mediaId: string, requestId: string, beforeJson: string, afterJson: string): Promise<void> {
  await db.prepare(
    `INSERT INTO audit_logs
      (id, actor_user_id, actor_role_code, action, entity_type, entity_id, result, before_json_private, after_json_private, request_id)
     VALUES (?, ?, ?, 'MEDIA_FINALIZE', 'MEDIA_ITEM', ?, 'SUCCESS', ?, ?, ?)`,
  ).bind(crypto.randomUUID(), actorUserId, actorRoleCode, mediaId, beforeJson, afterJson, requestId).run();
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const principal = await authorize(env, request);
  if ("error" in principal) return principal.error;
  if (!env.DB) return out(503, trace, undefined, { code: "DEPENDENCY_FAILURE", message: "মিডিয়া ব্যবস্থাপনা এখন উপলভ্য নয়।" });

  const body = await jsonBody(request);
  const mediaId = body ? text(body.mediaId, ID_LIMIT) : null;
  const expectedVersion = body ? positiveVersion(body.expectedVersion) : null;
  const darshanEventId = body?.darshanEventId === undefined ? undefined : text(body.darshanEventId, ID_LIMIT);
  const albumId = body?.albumId === undefined ? undefined : text(body.albumId, ID_LIMIT);
  const titleBn = body?.titleBn === undefined ? undefined : text(body.titleBn, TEXT_LIMIT, true);
  const titleEn = body?.titleEn === undefined ? undefined : text(body.titleEn, TEXT_LIMIT, true);
  const captionBn = body?.captionBn === undefined ? undefined : text(body.captionBn, TEXT_LIMIT, true);
  const captionEn = body?.captionEn === undefined ? undefined : text(body.captionEn, TEXT_LIMIT, true);
  const publicSlug = body?.publicSlug === undefined ? undefined : text(body.publicSlug, 160);

  if (!body || !mediaId || !expectedVersion) return out(400, trace, undefined, { code: "INVALID_INPUT", message: "মিডিয়া পরিচয় ও বর্তমান version দিতে হবে।" });
  if ((body.darshanEventId !== undefined && darshanEventId === null) || (body.albumId !== undefined && albumId === null) ||
      (body.titleBn !== undefined && titleBn === null) || (body.titleEn !== undefined && titleEn === null) ||
      (body.captionBn !== undefined && captionBn === null) || (body.captionEn !== undefined && captionEn === null) ||
      (body.publicSlug !== undefined && publicSlug === null)) {
    return out(400, trace, undefined, { code: "INVALID_INPUT", message: "মিডিয়া মেটাডেটার কোনো মান সঠিক নয়।" });
  }
  const safePublicSlug = publicSlug === undefined || publicSlug === null ? null : publicSlug;
  if (safePublicSlug !== null) {
    try { assertSafeObjectKeySegment(safePublicSlug, "publicSlug"); } catch { return out(400, trace, undefined, { code: "INVALID_INPUT", message: "publicSlug নিরাপদ নয়।" }); }
  }

  try {
    const media = await env.DB.prepare(
      `SELECT id,temple_id,darshan_event_id,album_id,media_type,title_bn,title_en,caption_bn,caption_en,bucket_name,object_key,mime_type,byte_size,object_etag,approval_status,publication_status,verification_status,version
       FROM media_items WHERE id=? AND temple_id=? LIMIT 1`,
    ).bind(mediaId, CANONICAL.templeId).first<MediaRow>();
    if (!media) return out(404, trace, undefined, { code: "NOT_FOUND", message: "মিডিয়া রেকর্ড পাওয়া যায়নি।" });
    if (media.approval_status === "REJECTED" || media.publication_status === "ARCHIVED") {
      return out(409, trace, undefined, { code: "INVALID_STATE", message: "এই মিডিয়া রেকর্ড এখন finalize করা যাবে না।" });
    }
    if (media.version !== expectedVersion) return out(409, trace, undefined, { code: "STALE_VERSION", message: "মিডিয়া রেকর্ডটি অন্য পরিবর্তনে আপডেট হয়েছে। আবার লোড করুন।" });

    const storage = B2StorageGateway.fromEnvironment(
      env as unknown as Record<string, string | undefined>,
      request.url,
    );
    const head = await storage.head(media.object_key);
    if (!head) return out(409, trace, undefined, { code: "OBJECT_NOT_FOUND", message: "আপলোড করা মিডিয়া অবজেক্ট পাওয়া যায়নি।" });
    if (head.contentLength !== null && head.contentLength !== media.byte_size) return out(409, trace, undefined, { code: "OBJECT_SIZE_MISMATCH", message: "স্টোরেজে থাকা ফাইলের আকার রেকর্ডের সঙ্গে মিলছে না।" });
    if (head.contentType && head.contentType.toLowerCase() !== media.mime_type.toLowerCase()) return out(409, trace, undefined, { code: "OBJECT_TYPE_MISMATCH", message: "স্টোরেজে থাকা ফাইলের ধরন রেকর্ডের সঙ্গে মিলছে না।" });

    const next = {
      darshanEventId: darshanEventId === undefined ? media.darshan_event_id : darshanEventId || null,
      albumId: albumId === undefined ? media.album_id : albumId || null,
      titleBn: titleBn === undefined ? media.title_bn : titleBn || null,
      titleEn: titleEn === undefined ? media.title_en : titleEn || null,
      captionBn: captionBn === undefined ? media.caption_bn : captionBn || null,
      captionEn: captionEn === undefined ? media.caption_en : captionEn || null,
      publicSlug: publicSlug === undefined ? undefined : publicSlug,
    };

    const nowVersion = expectedVersion + 1;
    const update = await env.DB.prepare(
      `UPDATE media_items
       SET darshan_event_id=?,album_id=?,title_bn=?,title_en=?,caption_bn=?,caption_en=?,
           public_slug=CASE WHEN ? IS NULL THEN public_slug ELSE ? END,
           object_etag=?,approval_status=CASE WHEN approval_status='DRAFT' THEN 'IN_REVIEW' ELSE approval_status END,
           verification_status=CASE WHEN verification_status='UNVERIFIED' THEN 'PENDING' ELSE verification_status END,version=?,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND temple_id=? AND version=? AND approval_status<>'REJECTED' AND publication_status<>'ARCHIVED'`,
    ).bind(
      next.darshanEventId,
      next.albumId,
      next.titleBn,
      next.titleEn,
      next.captionBn,
      next.captionEn,
      publicSlug === undefined ? null : publicSlug,
      publicSlug === undefined ? null : publicSlug,
      head.etag,
      nowVersion,
      mediaId,
      CANONICAL.templeId,
      expectedVersion,
    ).run();
    if ((update.meta?.changes ?? 0) !== 1) return out(409, trace, undefined, { code: "WRITE_CONFLICT", message: "মিডিয়া finalize অবস্থাটি ইতিমধ্যে বদলে গেছে। আবার চেষ্টা করুন।" });

    await writeAudit(
      env.DB,
      principal.userId,
      principal.roleCode,
      mediaId,
      trace,
      JSON.stringify({ version: expectedVersion, approvalStatus: media.approval_status, objectEtag: media.object_etag }),
      JSON.stringify({ version: nowVersion, approvalStatus: media.approval_status === "DRAFT" ? "IN_REVIEW" : media.approval_status, verificationStatus: media.verification_status === "UNVERIFIED" ? "PENDING" : media.verification_status, objectEtag: head.etag }),
    );

    return out(200, trace, {
      mediaId,
      version: nowVersion,
      approvalStatus: media.approval_status === "DRAFT" ? "IN_REVIEW" : media.approval_status,
      publicationStatus: media.publication_status,
      storageVerified: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("provider status")) return out(503, trace, undefined, { code: "STORAGE_PROVIDER_FAILURE", message: "মিডিয়া স্টোরেজ যাচাই এখন সম্পন্ন করা যাচ্ছে না।" });
    return out(500, trace, undefined, { code: "INTERNAL_FAILURE", message: "মিডিয়া finalize সম্পন্ন করা যায়নি।" });
  }
}

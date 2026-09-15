import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { findUserById, getUserPermissions } from "../../../../lib/files/auth/repository";
import { getSession } from "../../../../lib/files/auth/session";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";
import { CANONICAL } from "../../../../lib/config/canonical";
import { B2StorageGateway, generateObjectKey, productionStorageIdentity } from "../../../../lib/files/storage";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8192;
const MAX_NAME = 255;
const MAX_TITLE = 500;
const MAX_URL_TTL = 300;
const MEDIA_TYPES = ["IMAGE", "VIDEO", "AUDIO", "DOCUMENT"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];
const MIME_BY_TYPE: Record<MediaType, readonly string[]> = {
  IMAGE: ["image/jpeg", "image/png", "image/webp"],
  VIDEO: ["video/mp4", "video/webm"],
  AUDIO: ["audio/wav", "audio/mpeg"],
  DOCUMENT: ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain"],
};
const LIMITS: Record<MediaType, { maxBytes: number; maxCount: number }> = {
  IMAGE: { maxBytes: 5 * 1024 * 1024, maxCount: 10 },
  VIDEO: { maxBytes: 50 * 1024 * 1024, maxCount: 2 },
  AUDIO: { maxBytes: 25 * 1024 * 1024, maxCount: 2 },
  DOCUMENT: { maxBytes: 15 * 1024 * 1024, maxCount: 5 },
};

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; B2_ACCESS_KEY_ID?: string; B2_SECRET_ACCESS_KEY?: string; B2_BUCKET_NAME?: string; B2_REGION?: string; B2_S3_ENDPOINT?: string; NEXT_PUBLIC_SITE_URL?: string; SESSION_COOKIE_NAME?: string };
type Body = { mediaType?: unknown; fileName?: unknown; mimeType?: unknown; byteSize?: unknown; checksumSha256?: unknown; darshanEventId?: unknown; albumId?: unknown; titleBn?: unknown; titleEn?: unknown; captionBn?: unknown; captionEn?: unknown };

const HEADERS = { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
function env(): Env { return getCloudflareContext().env as unknown as Env; }
function traceId(request: Request): string { const value = request.headers.get("x-request-id")?.trim(); return value && value.length <= 128 ? value : crypto.randomUUID(); }
function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS }); }
function readString(value: unknown, max: number): string | null { if (typeof value !== "string") return null; const text = value.trim(); return text && text.length <= max ? text : null; }
function safeFileName(value: string): string | null { const normalized = value.normalize("NFKC").replace(/[\\/\u0000-\u001f\u007f]/g, "_").trim(); return normalized && normalized.length <= MAX_NAME && normalized !== "." && normalized !== ".." ? normalized : null; }
function extension(name: string): string | null { const value = name.split(".").pop()?.toLowerCase() ?? ""; return /^[a-z0-9]{1,12}$/.test(value) ? value : null; }
async function parseBody(request: Request): Promise<Body | null> { const length = request.headers.get("content-length"); if (length && (!/^\d+$/.test(length) || Number(length) > BODY_LIMIT)) return null; const text = await request.text(); if (new TextEncoder().encode(text).byteLength > BODY_LIMIT) return null; try { const parsed: unknown = JSON.parse(text); return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Body : null; } catch { return null; } }
function parseCookie(request: Request, name: string): string | null { const header = request.headers.get("cookie"); if (!header) return null; const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); const match = header.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`)); return match?.[1] ? decodeURIComponent(match[1]) : null; }
async function authorize(runtime: Env, request: Request): Promise<{ userId: string } | NextResponse> { if (!runtime.SESSION_STORE) return out(503, traceId(request), null, { code: "DEPENDENCY_FAILURE", message: "মিডিয়া আপলোড ব্যবস্থা এখন প্রস্তুত নয়।" }); const token = parseCookie(request, runtime.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session"); if (!token) return out(401, traceId(request), null, { code: "SESSION_INVALID", message: "অনুগ্রহ করে প্রশাসনিক অ্যাকাউন্ট দিয়ে লগইন করুন।" }); const session = await getSession(runtime.DB, runtime.SESSION_STORE, token); if (!session) return out(401, traceId(request), null, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" }); const user = await findUserById(runtime.DB, session.userId); if (!user || user.status !== "ACTIVE" || !user.personId) return out(403, traceId(request), null, { code: "FORBIDDEN", message: "এই আপলোডের অনুমতি নেই।" }); const permissions = await getUserPermissions(runtime.DB, user.id); if (!permissions.some((permission: { code: string }) => permission.code === "media.upload")) return out(403, traceId(request), null, { code: "FORBIDDEN", message: "মিডিয়া আপলোডের অনুমতি আপনার নেই।" }); return { userId: user.id }; }
async function sha256(text: string): Promise<string> { return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))), (byte) => byte.toString(16).padStart(2, "0")).join(""); }

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request); const runtime = env(); const principal = await authorize(runtime, request); if (principal instanceof NextResponse) return principal;
  const input = await parseBody(request);
  const mediaType = input ? readString(input.mediaType, 16)?.toUpperCase() as MediaType | undefined : undefined;
  const fileName = input ? safeFileName(readString(input.fileName, MAX_NAME) ?? "") : null;
  const mimeType = input ? readString(input.mimeType, 128)?.toLowerCase() : null;
  const byteSize = input && typeof input.byteSize === "number" ? input.byteSize : null;
  const checksum = input ? readString(input.checksumSha256, 64)?.toLowerCase() : null;
  const eventId = input?.darshanEventId == null ? null : readString(input.darshanEventId, 128);
  const albumId = input?.albumId == null ? null : readString(input.albumId, 128);
  const titleBn = input?.titleBn == null ? null : readString(input.titleBn, MAX_TITLE);
  const titleEn = input?.titleEn == null ? null : readString(input.titleEn, MAX_TITLE);
  const captionBn = input?.captionBn == null ? null : readString(input.captionBn, MAX_TITLE);
  const captionEn = input?.captionEn == null ? null : readString(input.captionEn, MAX_TITLE);
  if (!input || !mediaType || !MEDIA_TYPES.includes(mediaType) || !fileName || !mimeType || !Number.isSafeInteger(byteSize) || (byteSize as number) <= 0 || !checksum || !/^[0-9a-f]{64}$/.test(checksum)) return out(400, trace, null, { code: "INVALID_INPUT", message: "ফাইলের তথ্য সঠিক নয়।" });
  const normalizedSize = byteSize as number;
  if (!MIME_BY_TYPE[mediaType].includes(mimeType)) return out(400, trace, null, { code: "MIME_NOT_ALLOWED", message: "এই ফাইলের ধরন অনুমোদিত নয়।" });
  if (normalizedSize > LIMITS[mediaType].maxBytes) return out(400, trace, null, { code: "FILE_TOO_LARGE", message: "ফাইলটি নির্ধারিত সীমার বেশি।" });
  const count = await runtime.DB!.prepare("SELECT COUNT(*) AS count FROM media_items WHERE temple_id=? AND media_type=? AND publication_status<>'ARCHIVED'").bind(CANONICAL.templeId, mediaType).first<{ count: number }>();
  if (Number(count?.count ?? 0) >= LIMITS[mediaType].maxCount) return out(409, trace, null, { code: "MEDIA_COUNT_LIMIT", message: "এই ধরনের মিডিয়ার বর্তমান সীমা পূর্ণ হয়েছে।" });
  if (eventId) { const event = await runtime.DB!.prepare("SELECT id,temple_id FROM darshan_events WHERE id=? LIMIT 1").bind(eventId).first<{ id: string; temple_id: string }>(); if (!event || event.temple_id !== CANONICAL.templeId) return out(404, trace, null, { code: "EVENT_NOT_FOUND", message: "নির্বাচিত অনুষ্ঠান পাওয়া যায়নি।" }); }
  if (albumId) { const album = await runtime.DB!.prepare("SELECT id,temple_id FROM media_albums WHERE id=? LIMIT 1").bind(albumId).first<{ id: string; temple_id: string }>(); if (!album || album.temple_id !== CANONICAL.templeId) return out(404, trace, null, { code: "ALBUM_NOT_FOUND", message: "নির্বাচিত অ্যালবাম পাওয়া যায়নি।" }); }
  const mediaId = crypto.randomUUID(); const ext = extension(fileName); if (!ext) return out(400, trace, null, { code: "INVALID_FILE_NAME", message: "ফাইলের extension বৈধ নয়।" });
  const objectKey = generateObjectKey({ objectClass: "MEDIA_ORIGINAL", objectId: mediaId, extension: ext }); const storage = productionStorageIdentity(); const idem = request.headers.get("Idempotency-Key")?.trim() || crypto.randomUUID(); const idemHash = await sha256(idem); const now = new Date().toISOString();
  try {
    const prior = await runtime.DB!.prepare("SELECT storage_object_id FROM storage_upload_intents WHERE idempotency_key_hash=? LIMIT 1").bind(idemHash).first<{ storage_object_id: string }>();
    if (prior) {
      const existing = await runtime.DB!.prepare("SELECT id,object_key,mime_type,byte_size FROM media_items WHERE id=? LIMIT 1").bind(prior.storage_object_id).first<{ id: string; object_key: string; mime_type: string; byte_size: number }>();
      if (existing) return await issueUrl(runtime, request, trace, existing.id, existing.object_key, fileName, existing.mime_type, existing.byte_size, checksum);
    }
    const insertStorage = runtime.DB!.prepare("INSERT INTO storage_objects (id,object_class,entity_type,entity_id,provider,bucket_name,object_key,visibility,serving_mode,mime_type,byte_size,checksum_sha256,lifecycle_state,revision_id,version,created_by_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(mediaId,"MEDIA_ORIGINAL","MEDIA",mediaId,"B2",storage.bucket,objectKey,"PRIVATE","SIGNED_URL",mimeType,normalizedSize,checksum,"PENDING_UPLOAD",crypto.randomUUID(),1,principal.userId,now,now);
    const insertMedia = runtime.DB!.prepare("INSERT INTO media_items (id,temple_id,darshan_event_id,album_id,media_type,title_bn,title_en,caption_bn,caption_en,object_provider,bucket_name,object_key,mime_type,byte_size,checksum_sha256,storage_visibility,approval_status,publication_status,serving_mode,source_ids_json,verification_status,revision_id,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(mediaId,CANONICAL.templeId,eventId,albumId,mediaType,titleBn,titleEn,captionBn,captionEn,"B2",storage.bucket,objectKey,mimeType,normalizedSize,checksum,"PRIVATE","DRAFT","UNPUBLISHED","SIGNED_URL","[]","UNVERIFIED",crypto.randomUUID(),1,now,now);
    const insertIntent = runtime.DB!.prepare("INSERT INTO storage_upload_intents (id,storage_object_id,idempotency_key_hash,expected_byte_size,expected_checksum_sha256,expected_mime_type,expires_at,state,issued_to_user_id,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),mediaId,idemHash,normalizedSize,checksum,mimeType,new Date(Date.now()+MAX_URL_TTL*1000).toISOString(),"ISSUED",principal.userId,now,now);
    const audit = runtime.DB!.prepare("INSERT INTO audit_logs (id,actor_user_id,action,entity_type,entity_id,result,after_json_private,request_id,occurred_at,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),principal.userId,"MEDIA_UPLOAD_URL_ISSUED","MEDIA",mediaId,"SUCCESS",JSON.stringify({ mediaType, mimeType, byteSize: normalizedSize }),trace,now,now);
    await runtime.DB!.batch([insertStorage,insertMedia,insertIntent,audit]);
    return await issueUrl(runtime,request,trace,mediaId,objectKey,fileName,mimeType,normalizedSize,checksum);
  } catch (error) { return out(/unique|constraint/i.test(error instanceof Error ? error.message : "") ? 409 : 503, trace, null, { code: /unique|constraint/i.test(error instanceof Error ? error.message : "") ? "IDEMPOTENCY_CONFLICT" : "DEPENDENCY_FAILURE", message: "মিডিয়া আপলোড প্রস্তুত করা যায়নি।" }); }
}
async function issueUrl(runtime: Env, request: Request, trace: string, mediaId: string, objectKey: string, fileName: string, mimeType: string, byteSize: number, checksum: string): Promise<NextResponse> { try { const origin = runtime.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin; const gateway = B2StorageGateway.fromEnvironment(runtime as Record<string,string|undefined>, origin); const signed = await gateway.issueUploadAuthorization({ objectId: mediaId, objectKey, mimeType, expectedByteSize: byteSize, expectedChecksumSha256: checksum, expiresInSeconds: MAX_URL_TTL }); return out(201,trace,{ mediaId,fileName,upload:{method:signed.method,url:signed.url,expiresAt:signed.expiresAt},storage:{provider:"B2",visibility:"PRIVATE"} }); } catch { return out(503,trace,null,{code:"STORAGE_PROVIDER_FAILURE",message:"নিরাপদ আপলোড লিংক তৈরি করা যায়নি।"}); } }

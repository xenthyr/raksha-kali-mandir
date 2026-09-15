import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserPermissions, getUserRoles } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";
import { B2StorageGateway } from "../../../../lib/files/storage";
import type { D1Like } from "../../../../lib/db/client";
import { CANONICAL } from "../../../../lib/config/canonical";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8_192;
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
interface Body { mediaId?: unknown; expectedVersion?: unknown; }
interface MediaRow {
  id: string;
  media_type: string;
  bucket_name: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
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
  return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS });
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
  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > BODY_LIMIT) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return value && typeof value === "object" && !Array.isArray(value) ? value as Body : null;
  } catch { return null; }
}
function positiveVersion(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 2_147_483_647 ? value : null;
}
async function authorize(env: Env, request: Request): Promise<{ userId: string; roleCode: string } | { error: NextResponse }> {
  if (!env.DB || !env.SESSION_STORE) return { error: out(503, traceId(request), undefined, { code: "DEPENDENCY_FAILURE", message: "মিডিয়া processing এখন উপলভ্য নয়।" }) };
  const token = parseCookie(request, env.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session");
  if (!token) return { error: out(401, traceId(request), undefined, { code: "SESSION_INVALID", message: "অনুগ্রহ করে প্রশাসনিক অ্যাকাউন্ট দিয়ে লগইন করুন।" }) };
  const session = await getSession(env.DB, env.SESSION_STORE, token);
  if (!session) return { error: out(401, traceId(request), undefined, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" }) };
  const user = await findUserById(env.DB, session.userId);
  if (!user || user.status !== "ACTIVE" || !user.personId) return { error: out(403, traceId(request), undefined, { code: "FORBIDDEN", message: "এই কাজের অনুমতি নেই।" }) };
  const permissions = await getUserPermissions(env.DB, user.id);
  if (!permissions.some((permission) => permission.code === "media.upload" || permission.code === "media.publish")) return { error: out(403, traceId(request), undefined, { code: "FORBIDDEN", message: "মিডিয়া processing-এর অনুমতি আপনার নেই।" }) };
  const roles = await getUserRoles(env.DB, user.id);
  return { userId: user.id, roleCode: roles[0]?.code ?? "UNKNOWN" };
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as Env;
  const principal = await authorize(env, request);
  if ("error" in principal) return principal.error;
  if (!env.DB) return out(503, trace, undefined, { code: "DEPENDENCY_FAILURE", message: "মিডিয়া processing এখন উপলভ্য নয়।" });

  const body = await jsonBody(request);
  const mediaId = body && typeof body.mediaId === "string" ? body.mediaId.trim() : "";
  const expectedVersion = body ? positiveVersion(body.expectedVersion) : null;
  if (!body || !mediaId || mediaId.length > 128 || !expectedVersion) return out(400, trace, undefined, { code: "INVALID_INPUT", message: "মিডিয়া পরিচয় ও বর্তমান version সঠিকভাবে দিতে হবে।" });

  try {
    const media = await env.DB.prepare(
      `SELECT id,media_type,bucket_name,object_key,mime_type,byte_size,approval_status,publication_status,verification_status,version
       FROM media_items WHERE id=? AND temple_id=? LIMIT 1`,
    ).bind(mediaId, CANONICAL.templeId).first<MediaRow>();
    if (!media) return out(404, trace, undefined, { code: "NOT_FOUND", message: "মিডিয়া রেকর্ড পাওয়া যায়নি।" });
    if (media.version !== expectedVersion) return out(409, trace, undefined, { code: "STALE_VERSION", message: "মিডিয়া রেকর্ডটি ইতিমধ্যে পরিবর্তিত হয়েছে। আবার লোড করুন।" });
    if (media.publication_status === "ARCHIVED" || media.approval_status === "REJECTED") return out(409, trace, undefined, { code: "INVALID_STATE", message: "এই মিডিয়া আর process করা যাবে না।" });

    const storage = B2StorageGateway.fromEnvironment(env as unknown as Record<string, string | undefined>, request.url);
    const head = await storage.head(media.object_key);
    if (!head) return out(409, trace, undefined, { code: "OBJECT_NOT_FOUND", message: "স্টোরেজে মিডিয়া অবজেক্ট পাওয়া যায়নি।" });
    if (head.contentLength !== null && head.contentLength !== media.byte_size) return out(409, trace, undefined, { code: "OBJECT_SIZE_MISMATCH", message: "স্টোরেজ অবজেক্টের আকার রেকর্ডের সঙ্গে মিলছে না।" });
    if (head.contentType && head.contentType.toLowerCase() !== media.mime_type.toLowerCase()) return out(409, trace, undefined, { code: "OBJECT_TYPE_MISMATCH", message: "স্টোরেজ অবজেক্টের MIME type রেকর্ডের সঙ্গে মিলছে না।" });

    const nextVersion = expectedVersion + 1;
    const result = await env.DB.prepare(
      `UPDATE media_items
       SET object_etag=?,verification_status=CASE WHEN verification_status='UNVERIFIED' THEN 'PENDING' ELSE verification_status END,version=?,updated_at=CURRENT_TIMESTAMP
       WHERE id=? AND temple_id=? AND version=? AND approval_status<>'REJECTED' AND publication_status<>'ARCHIVED'`,
    ).bind(head.etag, nextVersion, mediaId, CANONICAL.templeId, expectedVersion).run();
    if ((result.meta?.changes ?? 0) !== 1) return out(409, trace, undefined, { code: "WRITE_CONFLICT", message: "মিডিয়া processing অবস্থাটি ইতিমধ্যে বদলে গেছে।" });

    await env.DB.prepare(
      `INSERT INTO audit_logs
        (id,actor_user_id,actor_role_code,action,entity_type,entity_id,result,before_json_private,after_json_private,request_id)
       VALUES (?,?,?,'MEDIA_PROCESS','MEDIA_ITEM',?,'SUCCESS',?,?,?)`,
    ).bind(
      crypto.randomUUID(),
      principal.userId,
      principal.roleCode,
      mediaId,
      JSON.stringify({ version: expectedVersion, verificationStatus: media.verification_status }),
      JSON.stringify({ version: nextVersion, verificationStatus: media.verification_status === "UNVERIFIED" ? "PENDING" : media.verification_status, objectEtag: head.etag }),
      trace,
    ).run();

    return out(200, trace, {
      mediaId,
      version: nextVersion,
      processingStatus: "PROCESSED",
      integrityStatus: "VERIFIED",
      approvalStatus: media.approval_status,
      publicationStatus: media.publication_status,
      objectVerified: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("provider status")) return out(503, trace, undefined, { code: "STORAGE_PROVIDER_FAILURE", message: "মিডিয়া স্টোরেজ processing এখন সম্পন্ন করা যাচ্ছে না।" });
    return out(500, trace, undefined, { code: "INTERNAL_FAILURE", message: "মিডিয়া processing সম্পন্ন করা যায়নি।" });
  }
}

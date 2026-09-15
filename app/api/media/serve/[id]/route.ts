import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { B2StorageGateway } from "../../../../../lib/files/storage";
import type { D1Like } from "../../../../../lib/db/client";
import { CANONICAL } from "../../../../../lib/config/canonical";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const ID_LIMIT = 128;
const MAX_RANGE_LENGTH = 128;
const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-site",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=60",
};
interface Env {
  DB?: D1Like;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_S3_ENDPOINT?: string;
  B2_ACCESS_KEY_ID?: string;
  B2_SECRET_ACCESS_KEY?: string;
}
interface MediaRow {
  id: string;
  media_type: string;
  bucket_name: string;
  object_key: string;
  mime_type: string;
  byte_size: number;
  checksum_sha256: string | null;
  approval_status: string;
  publication_status: string;
  serving_mode: "SIGNED_URL" | "AUTHORIZED_PROXY";
  public_slug: string | null;
  title_bn: string | null;
  title_en: string | null;
  caption_bn: string | null;
  caption_en: string | null;
}
function traceId(request: Request): string {
  const value = request.headers.get("x-request-id")?.trim();
  return value && value.length <= 128 ? value : crypto.randomUUID();
}
function errorResponse(status: number, trace: string, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message }, meta: { traceId: trace } }, { status, headers: { ...HEADERS, "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8" } });
}
function normalizeId(value: string | undefined): string | null {
  if (!value) return null;
  const id = value.trim();
  return id && id.length <= ID_LIMIT ? id : null;
}
function passThroughHeaders(source: Headers, contentType: string, mediaType: string): Headers {
  const headers = new Headers(HEADERS);
  headers.set("Content-Type", contentType || "application/octet-stream");
  const length = source.get("content-length");
  if (length) headers.set("Content-Length", length);
  const contentRange = source.get("content-range");
  if (contentRange) headers.set("Content-Range", contentRange);
  const acceptRanges = source.get("accept-ranges");
  headers.set("Accept-Ranges", acceptRanges || "bytes");
  const etag = source.get("etag");
  if (etag) headers.set("ETag", etag);
  headers.set("Content-Disposition", mediaType === "DOCUMENT" ? "attachment" : "inline");
  return headers;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const trace = traceId(request);
  let env: Env;
  try {
    env = getCloudflareContext().env as unknown as Env;
  } catch {
    return errorResponse(503, trace, "DEPENDENCY_FAILURE", "মিডিয়া এখন পাওয়া যাচ্ছে না।");
  }
  if (!env.DB) return errorResponse(503, trace, "DEPENDENCY_FAILURE", "মিডিয়া এখন পাওয়া যাচ্ছে না।");

  const id = normalizeId((await context.params).id);
  if (!id) return errorResponse(400, trace, "INVALID_ID", "মিডিয়ার পরিচয় সঠিক নয়।");

  const range = request.headers.get("range")?.trim() || undefined;
  if (range && range.length > MAX_RANGE_LENGTH) return errorResponse(416, trace, "INVALID_RANGE", "মিডিয়া range অনুরোধটি সঠিক নয়।");

  try {
    const media = await env.DB.prepare(
      `SELECT id,media_type,bucket_name,object_key,mime_type,byte_size,checksum_sha256,approval_status,publication_status,serving_mode,public_slug,title_bn,title_en,caption_bn,caption_en
       FROM media_items
       WHERE temple_id=? AND (id=? OR public_slug=?) AND approval_status='APPROVED' AND publication_status='PUBLISHED'
       LIMIT 1`,
    ).bind(CANONICAL.templeId, id, id).first<MediaRow>();
    if (!media) return errorResponse(404, trace, "NOT_FOUND", "প্রকাশিত মিডিয়া পাওয়া যায়নি।");
    if (media.serving_mode !== "AUTHORIZED_PROXY") {
      return errorResponse(409, trace, "SERVING_MODE_UNAVAILABLE", "মিডিয়াটি অনুমোদিত serving mode-এ নেই।");
    }

    const storage = B2StorageGateway.fromEnvironment(env as unknown as Record<string, string | undefined>, request.url);
    const object = await storage.get(media.object_key, range);
    if (object.status === 404 || !object.body) return errorResponse(404, trace, "OBJECT_NOT_FOUND", "মিডিয়া অবজেক্ট পাওয়া যায়নি।");
    if (![200, 206, 304].includes(object.status)) return errorResponse(503, trace, "STORAGE_PROVIDER_FAILURE", "মিডিয়া এখন সরবরাহ করা যাচ্ছে না।");

    const headers = passThroughHeaders(object.headers, media.mime_type, media.media_type);
    headers.set("X-Media-Id", media.id);
    return new Response(object.body, { status: object.status, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("provider status")) return errorResponse(503, trace, "STORAGE_PROVIDER_FAILURE", "মিডিয়া স্টোরেজ থেকে এখন তথ্য পাওয়া যাচ্ছে না।");
    return errorResponse(500, trace, "INTERNAL_FAILURE", "মিডিয়া এখন নির্ভরযোগ্যভাবে সরবরাহ করা যাচ্ছে না।");
  }
}

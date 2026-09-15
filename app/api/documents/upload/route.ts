import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserPermissions } from "../../../../lib/files/auth/repository";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";
import { generateObjectKey, B2StorageGateway } from "../../../../lib/files/storage";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const MAX_BODY = 8192;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const ALLOWED = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "image/jpeg",
  "image/png",
]);
const EXT_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-excel": "xls",
  "text/csv": "csv",
  "image/jpeg": "jpg",
  "image/png": "png",
};
const DOC_TYPE_BY_MIME: Record<string, string> = {
  "application/pdf": "PDF",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "WORD",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "EXCEL",
  "application/vnd.ms-excel": "EXCEL",
  "text/csv": "EXCEL",
  "image/jpeg": "IMAGE",
  "image/png": "IMAGE",
};
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; SESSION_COOKIE_NAME?: string; B2_ACCESS_KEY_ID?: string; B2_SECRET_ACCESS_KEY?: string; B2_BUCKET_NAME?: string; B2_REGION?: string; B2_S3_ENDPOINT?: string };
type Body = { titleBn?: unknown; titleEn?: unknown; category?: unknown; documentDate?: unknown; approximateDate?: unknown; issuer?: unknown; authority?: unknown; language?: unknown; sourceId?: unknown; accessPolicy?: unknown; fileName?: unknown; mimeType?: unknown; fileSize?: unknown; checksumSha256?: unknown };

function trace(request: Request): string { const value = request.headers.get("x-request-id")?.trim(); return value && value.length <= 128 ? value : crypto.randomUUID(); }
function out(status: number, traceId: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId } } : { ok: true, data, meta: { traceId } }, { status, headers: HEADERS }); }
function text(value: unknown, max: number): string | null { if (typeof value !== "string") return null; const v = value.trim(); return v && v.length <= max ? v : null; }
function cookie(request: Request, name: string): string | null { const raw = request.headers.get("cookie"); if (!raw) return null; const found = raw.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
async function parse(request: Request): Promise<Body | null> { const len = request.headers.get("content-length"); if (len && (!/^\d+$/.test(len) || Number(len) > MAX_BODY)) return null; const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > MAX_BODY) return null; try { const value: unknown = JSON.parse(raw); return value && typeof value === "object" && !Array.isArray(value) ? value as Body : null; } catch { return null; } }
async function staff(db: AuthDatabase, store: AuthSessionStore | undefined, request: Request, cookieName: string, permission: string): Promise<{ userId: string } | null> { if (!store) return null; const token = cookie(request, cookieName); if (!token) return null; const session = await getSession(db, store, token); if (!session) return null; const user = await findUserById(db, session.userId); if (!user || user.status !== "ACTIVE" || !user.personId) return null; const permissions = await getUserPermissions(db, user.id); return permissions.some((item) => item.code === permission) ? { userId: user.id } : null; }

function sha256Hex(value: string): Promise<string> { return crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)).then((bytes) => Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("")); }

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = trace(request);
  try {
    const runtime = getCloudflareContext().env as unknown as Env;
    if (!runtime.DB) return out(503, traceId, null, { code: "DEPENDENCY_FAILURE", message: "ডকুমেন্ট ব্যবস্থা এখন প্রস্তুত নয়।" });
    const principal = await staff(runtime.DB, runtime.SESSION_STORE, request, runtime.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session", "document.upload");
    if (!principal) return out(403, traceId, null, { code: "FORBIDDEN", message: "ডকুমেন্ট আপলোডের অনুমতি নেই।" });

    const body = await parse(request);
    const titleBn = text(body?.titleBn, 300);
    const titleEn = body?.titleEn == null ? null : text(body.titleEn, 300);
    const category = body?.category == null ? null : text(body.category, 120);
    const documentDate = body?.documentDate == null ? null : text(body.documentDate, 32);
    const approximateDate = body?.approximateDate == null ? null : text(body.approximateDate, 120);
    const issuer = body?.issuer == null ? null : text(body.issuer, 240);
    const authority = body?.authority == null ? null : text(body.authority, 240);
    const language = body?.language == null ? null : text(body.language, 32);
    const sourceId = body?.sourceId == null ? null : text(body.sourceId, 128);
    const accessPolicy = body?.accessPolicy == null ? "ADMIN_ONLY" : text(body.accessPolicy, 32);
    const fileName = text(body?.fileName, 240);
    const mimeType = text(body?.mimeType, 160)?.toLowerCase() ?? null;
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : null;
    const checksumSha256 = text(body?.checksumSha256, 128)?.toLowerCase() ?? null;

    if (!body || !titleBn || !fileName || !mimeType || !ALLOWED.has(mimeType) || fileSize === null || !Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > MAX_FILE_SIZE || !checksumSha256 || !/^[0-9a-f]{64}$/.test(checksumSha256) || !["ADMIN_ONLY", "INTERNAL_STAFF", "APPROVED_PUBLIC"].includes(accessPolicy ?? "")) {
      return out(400, traceId, null, { code: "INVALID_INPUT", message: "ডকুমেন্টের তথ্য, MIME type, আকার এবং checksum সঠিক নয়।" });
    }
    if (approximateDate === "") return out(400, traceId, null, { code: "INVALID_INPUT", message: "আনুমানিক তারিখ খালি রাখা যাবে না।" });
    if (documentDate && !/^\d{4}-\d{2}-\d{2}$/.test(documentDate)) return out(400, traceId, null, { code: "INVALID_DATE", message: "ডকুমেন্টের তারিখ সঠিক নয়।" });
    const extension = EXT_BY_MIME[mimeType];
    const documentType = DOC_TYPE_BY_MIME[mimeType];
    const documentId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const objectKey = generateObjectKey({ objectClass: "DOCUMENT_PRIVATE", objectId: versionId, extension });
    const now = new Date().toISOString();

    const duplicate = await runtime.DB.prepare("SELECT id FROM document_versions WHERE checksum_sha256=? LIMIT 1").bind(checksumSha256).first<{ id: string }>();
    if (duplicate) return out(409, traceId, null, { code: "DUPLICATE_DOCUMENT", message: "এই ফাইলের একই checksum-যুক্ত সংস্করণ ইতিমধ্যে রয়েছে।" });

    const idem = request.headers.get("Idempotency-Key")?.trim() || null;
    const idemHash = idem ? await sha256Hex(idem) : null;
    if (idem && (idem.length < 16 || idem.length > 200)) return out(400, traceId, null, { code: "INVALID_IDEMPOTENCY_KEY", message: "Idempotency-Key সঠিক নয়।" });
    const requestHash = await sha256Hex(JSON.stringify({ titleBn, titleEn, category, documentDate, approximateDate, issuer, authority, language, sourceId, accessPolicy, fileName, mimeType, fileSize, checksumSha256 }));
    if (idemHash) {
      const prior = await runtime.DB.prepare("SELECT id,metadata_json FROM document_state_events WHERE idempotency_key_hash=? AND reason_code='ADMIN_UPLOAD' LIMIT 1").bind(idemHash).first<{ id: string; metadata_json: string }>();
      if (prior) {
        let metadata: unknown;
        try { metadata = JSON.parse(prior.metadata_json); } catch { return out(500, traceId, null, { code: "IDEMPOTENCY_RESULT_INVALID", message: "পূর্ববর্তী upload ফলাফল উদ্ধার করা যায়নি।" }); }
        if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return out(500, traceId, null, { code: "IDEMPOTENCY_RESULT_INVALID", message: "পূর্ববর্তী upload ফলাফল উদ্ধার করা যায়নি।" });
        const record = metadata as { requestHash?: unknown; documentId?: unknown; versionId?: unknown };
        if (record.requestHash !== requestHash) return out(409, traceId, null, { code: "IDEMPOTENCY_CONFLICT", message: "এই Idempotency-Key অন্য অনুরোধের সঙ্গে যুক্ত।" });
        if (typeof record.documentId !== "string" || typeof record.versionId !== "string") return out(500, traceId, null, { code: "IDEMPOTENCY_RESULT_INVALID", message: "পূর্ববর্তী upload ফলাফল উদ্ধার করা যায়নি।" });
        return out(200, traceId, { documentId: record.documentId, versionId: record.versionId, status: "UPLOADED", duplicate: true });
      }
    }

    const statements = [
      runtime.DB.prepare(`INSERT INTO documents(id,title_bn,title_en,document_type,category,document_date,approximate_date,issuer,authority,uploader_user_id,upload_role,uploaded_at,state,public_private,access_policy,language,ocr_required,verification_status,current_version_no,revision_id,source_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,? ,?,'UPLOADED','PRIVATE',?,?,0,'UNVERIFIED',1,?,?,?,?)`).bind(documentId, titleBn, titleEn, documentType, category, documentDate, approximateDate, issuer, authority, principal.userId, "ADMIN", now, accessPolicy === "APPROVED_PUBLIC" ? "PUBLIC_PENDING" : "PRIVATE", language, crypto.randomUUID(), sourceId, now, now),
      runtime.DB.prepare(`INSERT INTO document_versions(id,document_id,version_no,file_name,file_type,file_size,checksum_sha256,storage_object_key_private,storage_provider,upload_state,file_type_verified,integrity_verified,malware_scan_status,extraction_status,created_by_user_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,'UPLOADED',0,0,'PENDING','NOT_STARTED',?,?,?)`).bind(versionId, documentId, 1, fileName, mimeType, fileSize, checksumSha256, objectKey, "BACKBLAZE_B2", principal.userId, now, now),
      runtime.DB.prepare(`INSERT INTO document_state_events(id,document_id,from_state,to_state,reason_code,actor_user_id,actor_role,occurred_at,revision_id,idempotency_key_hash,metadata_json) VALUES(?,? ,NULL,'UPLOADED','ADMIN_UPLOAD',?,'ADMIN',?,?,?,?)`).bind(crypto.randomUUID(), documentId, principal.userId, now, crypto.randomUUID(), idemHash, JSON.stringify({ traceId, requestHash, documentId, versionId })),
      runtime.DB.prepare(`INSERT INTO document_reviews(id,document_id,version_id,review_stage,decision,created_at,updated_at,revision_id) VALUES(?,?,?,?, 'PENDING',?,?,?)`).bind(crypto.randomUUID(), documentId, versionId, "SECURITY", now, now, crypto.randomUUID()),
      runtime.DB.prepare(`INSERT INTO document_reviews(id,document_id,version_id,review_stage,decision,created_at,updated_at,revision_id) VALUES(?,?,?,?, 'PENDING',?,?,?)`).bind(crypto.randomUUID(), documentId, versionId, "METADATA", now, now, crypto.randomUUID()),
    ];
    await runtime.DB.batch(statements);

    const gateway = B2StorageGateway.fromEnvironment(runtime as Record<string, string | undefined>, request.url);
    const authorization = await gateway.issueUploadAuthorization({ objectId: versionId, objectKey, mimeType, expectedByteSize: fileSize, expectedChecksumSha256: checksumSha256, expiresInSeconds: 300 });
    return out(201, traceId, { documentId, versionId, status: "UPLOADED", upload: { method: authorization.method, url: authorization.url, expiresAt: authorization.expiresAt, expectedChecksumSha256: checksumSha256, expectedByteSize: fileSize } });
  } catch {
    return out(500, traceId, null, { code: "INTERNAL_FAILURE", message: "ডকুমেন্ট আপলোডের অনুরোধ সম্পন্ন করা যায়নি।" });
  }
}

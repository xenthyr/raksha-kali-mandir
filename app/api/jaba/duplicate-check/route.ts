import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../lib/files/auth/session";
import { findUserById, getUserPermissions } from "../../../../lib/files/auth/repository";
import { hashOpaqueToken } from "../../../../lib/files/auth/crypto";
import type { AuthDatabase, AuthSessionStore } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; SESSION_COOKIE_NAME?: string };
type Body = { submissionId?: unknown; expectedVersion?: unknown; matchBasis?: unknown };
type SubmissionRow = { id: string; cycle_id: string | null; mode: string; state: string; participant_id: string; version: number };
type ParticipantRow = { id: string; display_name: string; gotra: string | null; prayer_purpose: string | null; email_private: string | null; phone_private: string | null };
type ExistingRow = { id: string; state: string; verification_status: string; verified_identity_key: string | null; participant_id: string; submission_reference: string };

function trace(request: Request): string { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
function out(status: number, traceId: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId } } : { ok: true, data, meta: { traceId } }, { status, headers: HEADERS }); }
function text(v: unknown, max: number): string | null { if (typeof v !== "string") return null; const s = v.trim(); return s && s.length <= max ? s : null; }
function cookie(request: Request, name: string): string | null { const raw = request.headers.get("cookie"); if (!raw) return null; const found = raw.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
async function parseBody(request: Request): Promise<Body | null> { const len = request.headers.get("content-length"); if (len && (!/^\d+$/.test(len) || Number(len) > 4096)) return null; const raw = await request.text(); if (new TextEncoder().encode(raw).byteLength > 4096) return null; try { const p: unknown = JSON.parse(raw); return p && typeof p === "object" && !Array.isArray(p) ? p as Body : null; } catch { return null; } }
async function requireStaff(env: Env, request: Request): Promise<{ userId: string } | NextResponse> {
  if (!env.DB || !env.SESSION_STORE) return out(503, trace(request), null, { code: "DEPENDENCY_FAILURE", message: "Jaba যাচাই ব্যবস্থা এখন প্রস্তুত নয়।" });
  const token = cookie(request, env.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session");
  if (!token) return out(401, trace(request), null, { code: "SESSION_INVALID", message: "অনুগ্রহ করে প্রশাসনিক অ্যাকাউন্ট দিয়ে লগইন করুন।" });
  const session = await getSession(env.DB, env.SESSION_STORE, token);
  if (!session) return out(401, trace(request), null, { code: "SESSION_INVALID", message: "আপনার প্রশাসনিক সেশনটি আর বৈধ নয়।" });
  const user = await findUserById(env.DB, session.userId);
  if (!user || user.status !== "ACTIVE" || !user.personId) return out(403, trace(request), null, { code: "FORBIDDEN", message: "এই যাচাইয়ের অনুমতি নেই।" });
  const permissions = await getUserPermissions(env.DB, user.id);
  if (!permissions.some((p) => p.code === "committee.manage")) return out(403, trace(request), null, { code: "FORBIDDEN", message: "Jaba duplicate যাচাই করার অনুমতি আপনার নেই।" });
  return { userId: user.id };
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId = trace(request);
  const env = getCloudflareContext().env as unknown as Env;
  const staff = await requireStaff(env, request);
  if (staff instanceof NextResponse) return staff;
  if (!env.DB) return out(503, traceId, null, { code: "DEPENDENCY_FAILURE", message: "Jaba যাচাই ব্যবস্থা এখন প্রস্তুত নয়।" });
  const body = await parseBody(request);
  const submissionId = body ? text(body.submissionId, 128) : null;
  const matchBasis = body ? text(body.matchBasis, 64) : null;
  const expectedVersion = body && typeof body.expectedVersion === "number" ? body.expectedVersion : null;
  if (!body || !submissionId || !matchBasis || expectedVersion === null || !Number.isSafeInteger(expectedVersion) || expectedVersion < 1) return out(400, traceId, null, { code: "INVALID_INPUT", message: "Submission ID, match basis এবং expected version দিতে হবে।" });
  try {
    const submission = await env.DB.prepare(`SELECT id,cycle_id,mode,state,participant_id,version FROM jaba_submissions WHERE id=? AND mode='MONTHLY_AMAVASYA_JABA' LIMIT 1`).bind(submissionId).first<SubmissionRow>();
    if (!submission) return out(404, traceId, null, { code: "NOT_FOUND", message: "Monthly Jaba submission পাওয়া যায়নি।" });
    if (!submission.cycle_id) return out(409, traceId, null, { code: "INVALID_STATE", message: "Submission-এর সঙ্গে Amavasya cycle যুক্ত নেই।" });
    if (submission.version !== expectedVersion) return out(409, traceId, null, { code: "STALE_VERSION", message: "Submission-এর তথ্য ইতিমধ্যে পরিবর্তিত হয়েছে।" });
    const participant = await env.DB.prepare(`SELECT id,display_name,gotra,prayer_purpose,email_private,phone_private FROM jaba_participants WHERE id=? LIMIT 1`).bind(submission.participant_id).first<ParticipantRow>();
    if (!participant) return out(404, traceId, null, { code: "NOT_FOUND", message: "Participant record পাওয়া যায়নি।" });

    const basis = matchBasis.toUpperCase();
    if(!["EMAIL","PHONE","PROFILE"].includes(basis)) return out(400, traceId, null, { code: "INVALID_MATCH_BASIS", message: "Duplicate যাচাইয়ের match basis সঠিক নয়।" });
    if(basis === "EMAIL" && !participant.email_private) return out(409, traceId, null, { code: "MATCH_BASIS_UNAVAILABLE", message: "এই participant-এর email ভিত্তিক যাচাই করার তথ্য নেই।" });
    if(basis === "PHONE" && !participant.phone_private) return out(409, traceId, null, { code: "MATCH_BASIS_UNAVAILABLE", message: "এই participant-এর phone ভিত্তিক যাচাই করার তথ্য নেই।" });
    const rawBasis = basis === "EMAIL" && participant.email_private
      ? `EMAIL:${participant.email_private.trim().toLowerCase()}`
      : basis === "PHONE" && participant.phone_private
        ? `PHONE:${participant.phone_private.replace(/[^0-9+]/g, "")}`
        : `PROFILE:${participant.display_name.trim().toLocaleLowerCase("bn-IN")}|${(participant.gotra ?? "").trim().toLocaleLowerCase("bn-IN")}|${(participant.prayer_purpose ?? "").trim().toLocaleLowerCase("bn-IN")}`;
    const candidateKey = await hashOpaqueToken(rawBasis);
    const matches = basis === "EMAIL" && participant.email_private
      ? await env.DB.prepare(`SELECT js.id,js.state,js.verification_status,js.verified_identity_key,jp.id participant_id,js.submission_reference FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.cycle_id=? AND js.mode='MONTHLY_AMAVASYA_JABA' AND js.id<>? AND js.verification_status='VERIFIED' AND lower(trim(jp.email_private))=lower(trim(?)) ORDER BY js.created_at LIMIT 5`).bind(submission.cycle_id, submission.id, participant.email_private).all<ExistingRow>()
      : basis === "PHONE" && participant.phone_private
        ? await env.DB.prepare(`SELECT js.id,js.state,js.verification_status,js.verified_identity_key,jp.id participant_id,js.submission_reference FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.cycle_id=? AND js.mode='MONTHLY_AMAVASYA_JABA' AND js.id<>? AND js.verification_status='VERIFIED' AND replace(replace(replace(jp.phone_private,' ',''),'-',''),'+','')=replace(replace(replace(?,' ',''),'-',''),'+','') ORDER BY js.created_at LIMIT 5`).bind(submission.cycle_id, submission.id, participant.phone_private).all<ExistingRow>()
        : await env.DB.prepare(`SELECT js.id,js.state,js.verification_status,js.verified_identity_key,jp.id participant_id,js.submission_reference FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.cycle_id=? AND js.mode='MONTHLY_AMAVASYA_JABA' AND js.id<>? AND js.verification_status='VERIFIED' AND lower(trim(jp.display_name))=lower(trim(?)) AND lower(trim(coalesce(jp.gotra,'')))=lower(trim(coalesce(?,''))) ORDER BY js.created_at LIMIT 5`).bind(submission.cycle_id, submission.id, participant.display_name, participant.gotra).all<ExistingRow>();
    const found = matches.results.length > 0;
    const outcome = found ? "MATCH_REVIEW" : "NO_MATCH";
    const duplicateCheckId = crypto.randomUUID();
    await env.DB.prepare(`INSERT INTO jaba_duplicate_checks(id,submission_id,cycle_id,candidate_identity_key,match_basis,outcome,reviewed_by,reviewed_at,review_note_private,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(duplicateCheckId, submission.id, submission.cycle_id, candidateKey, basis, outcome, staff.userId, new Date().toISOString(), found ? `Potential cycle duplicate: ${matches.results.length} verified match(es).` : null).run();
    await env.DB.prepare(`INSERT INTO support_audit_events(id,actor_user_id,action,entity_type,entity_id,after_json,reason_code,occurred_at,metadata_json) VALUES(?,?,?,?,?,?,?,?,?)`).bind(crypto.randomUUID(), staff.userId, "JABA_DUPLICATE_CHECK", "JabaDuplicateCheck", duplicateCheckId, JSON.stringify({ outcome, matchBasis: basis, matchCount: matches.results.length }), "DUPLICATE_REVIEW", new Date().toISOString(), JSON.stringify({ traceId })).run();
    return out(201, traceId, { duplicateCheckId, submissionId: submission.id, outcome, matchCount: matches.results.length, reviewRequired: found });
  } catch {
    return out(500, traceId, null, { code: "INTERNAL_FAILURE", message: "Duplicate যাচাই এখন সংরক্ষণ করা যাচ্ছে না।" });
  }
}

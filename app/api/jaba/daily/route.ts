import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 8192;
const MAX_NAME = 160;
const MAX_PURPOSE = 1000;
const MAX_EMAIL = 254;
const MAX_PHONE = 32;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase; JABA_RATE_LIMIT_CONFIG?: string; TURNSTILE_SECRET_KEY?: string; ENVIRONMENT?: "production" | "preview" | "development" };
type Body = { displayName?: unknown; prayerPurpose?: unknown; email?: unknown; phone?: unknown; anonymousPublic?: unknown };
type Existing = { id: string; submission_reference: string; state: string; display_name: string; prayer_purpose: string | null; email_private: string | null; phone_private: string | null; anonymous_public: number };
function traceId(request: Request): string { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }) { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS }); }
function text(v: unknown, max: number): string | null { if (typeof v !== "string") return null; const s=v.trim(); return s && s.length<=max?s:null; }
async function parse(request: Request): Promise<Body|null> { const len=request.headers.get("content-length"); if(len&&(!/^\d+$/.test(len)||Number(len)>BODY_LIMIT))return null; const raw=await request.text(); if(new TextEncoder().encode(raw).byteLength>BODY_LIMIT)return null; try{const p:unknown=JSON.parse(raw);return p&&typeof p==="object"&&!Array.isArray(p)?p as Body:null;}catch{return null;} }
function normalizeEmail(v:string|null){return v?v.toLowerCase():null;}
function normalizePhone(v:string|null){return v?v.replace(/[^+0-9]/g,""):null;}
function publicReference(){const year=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",year:"numeric"}).format(new Date()); return `JABA-${year}-${crypto.randomUUID().replaceAll("-","").slice(0,10).toUpperCase()}`;}
function clientAddress(request: Request): string { return request.headers.get("cf-connecting-ip")?.trim() || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"; }
function rateConfig(raw: string | undefined): { windowMinutes: number; maxRequests: number } {
  const defaults = { windowMinutes: 15, maxRequests: 5 };
  if (!raw) return defaults;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaults;
    const value = parsed as Record<string, unknown>;
    const windowMinutes = typeof value.windowMinutes === "number" && Number.isInteger(value.windowMinutes) && value.windowMinutes >= 1 && value.windowMinutes <= 1440 ? value.windowMinutes : defaults.windowMinutes;
    const maxRequests = typeof value.maxRequests === "number" && Number.isInteger(value.maxRequests) && value.maxRequests >= 1 && value.maxRequests <= 100 ? value.maxRequests : defaults.maxRequests;
    return { windowMinutes, maxRequests };
  } catch { return defaults; }
}

export async function POST(request:Request):Promise<NextResponse>{
  const trace=traceId(request); const runtime=getCloudflareContext().env as unknown as Env; const db=runtime.DB;
  if(!db)return out(503,trace,null,{code:"DEPENDENCY_FAILURE",message:"দৈনিক জবা ব্যবস্থা এখন প্রস্তুত নয়।"});
  const key=request.headers.get("Idempotency-Key")?.trim()||null; if(!key||key.length<16||key.length>200)return out(400,trace,null,{code:"IDEMPOTENCY_KEY_REQUIRED",message:"অনুরোধটি নিরাপদে পুনরাবৃত্তি করতে Idempotency-Key প্রয়োজন।"});
  const body=await parse(request);
  const displayName=text(body?.displayName,MAX_NAME)??""; const prayerPurpose=text(body?.prayerPurpose,MAX_PURPOSE); const email=normalizeEmail(text(body?.email,MAX_EMAIL)); const phone=normalizePhone(text(body?.phone,MAX_PHONE)); const anonymous=body?.anonymousPublic===false?0:1;
  const requestFingerprint=await hashOpaqueToken(`${clientAddress(request)}|${request.headers.get("user-agent")??""}`);
  const rate=rateConfig(runtime.JABA_RATE_LIMIT_CONFIG);
  const recent=await db.prepare(`SELECT COUNT(*) AS count FROM jaba_fraud_signals WHERE signal_type='DAILY_JABA_RATE' AND signal_value_opaque=? AND detected_at>=datetime('now', ?)`).bind(requestFingerprint, `-${rate.windowMinutes} minutes`).first<{count:number}>();
  if(Number(recent?.count??0)>=rate.maxRequests)return out(429,trace,null,{code:"RATE_LIMITED",message:"আজকের জবা নিবেদনের অনুরোধসীমা অতিক্রম হয়েছে। কিছুক্ষণ পরে আবার চেষ্টা করুন."});
  if(!body||(!displayName&&!prayerPurpose))return out(400,trace,null,{code:"INVALID_INPUT",message:"নাম অথবা প্রার্থনার উদ্দেশ্য অন্তত একটি দিতে হবে।"});
  if(email&&(!/^\S+@\S+\.\S+$/.test(email)||email.length>MAX_EMAIL))return out(400,trace,null,{code:"INVALID_INPUT",message:"ইমেল ঠিকানাটি সঠিক নয়।"});
  if(phone&&phone.length>MAX_PHONE)return out(400,trace,null,{code:"INVALID_INPUT",message:"ফোন নম্বরটি সঠিক নয়।"});
  try{
    const idem=await hashOpaqueToken(key); const existing=await db.prepare(`SELECT js.id,js.submission_reference,js.state,jp.display_name,js.prayer_purpose,jp.email_private,jp.phone_private,js.anonymous_public FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.idempotency_key_hash=? LIMIT 1`).bind(idem).first<Existing>();
    if(existing){
      const samePayload=existing.display_name===(displayName||"নাম প্রকাশ করা হয়নি") && (existing.prayer_purpose??null)===(prayerPurpose??null) && (existing.email_private??null)===(email??null) && (existing.phone_private??null)===(phone??null) && Number(existing.anonymous_public)===anonymous;
      if(!samePayload)return out(409,trace,null,{code:"IDEMPOTENCY_CONFLICT",message:"এই Idempotency-Key অন্য একটি অনুরোধের সঙ্গে যুক্ত।"});
      return out(200,trace,{submissionId:existing.id,submissionReference:existing.submission_reference,mode:"DAILY_JABA",state:existing.state,duplicate:true});
    }
    const participantId=crypto.randomUUID(); const submissionId=crypto.randomUUID(); const revisionId=crypto.randomUUID(); const submissionReference=publicReference(); const now=new Date().toISOString();
    const participant=await db.prepare(`INSERT INTO jaba_participants(id,display_name,display_name_public,prayer_purpose,email_private,phone_private,anonymous_public,status,verification_status,revision_id,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,'ACTIVE','UNVERIFIED',?,1,?,?)`).bind(participantId,displayName||"নাম প্রকাশ করা হয়নি",anonymous?null:displayName||null,prayerPurpose,email,phone,anonymous,revisionId,now,now);
    const submission=await db.prepare(`INSERT INTO jaba_submissions(id,cycle_id,participant_id,mode,prayer_purpose,submission_reference,state,verification_status,idempotency_key_hash,verified_identity_key,donation_id,anonymous_public,submitted_at,verified_at,source_id,revision_id,version,created_at,updated_at) VALUES(?,NULL,?,'DAILY_JABA',?,?, 'SUBMITTED','UNVERIFIED',?,NULL,NULL,?, ?, NULL,?,1,?,?)`).bind(submissionId,participantId,prayerPurpose,submissionReference,idem,anonymous,now,now,revisionId,now,now);
    const signal=db.prepare(`INSERT INTO jaba_fraud_signals(id,submission_id,signal_type,severity,signal_value_opaque,detected_at,created_at,updated_at) VALUES(?,? ,'DAILY_JABA_RATE','LOW',?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),submissionId,requestFingerprint);
    const result=await db.batch([participant,submission,signal]);
    if(Number((result?.[1] as {meta?:{changes?:number}})?.meta?.changes??0)!==1)return out(409,trace,null,{code:"WRITE_CONFLICT",message:"দৈনিক জবার অংশগ্রহণ সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।"});
    return out(201,trace,{submissionId,submissionReference,mode:"DAILY_JABA",state:"SUBMITTED",donationRequired:false,anonymousPublic:Boolean(anonymous)});
  }catch{
    try {
      const idem=await hashOpaqueToken(key);
      const existing=await db.prepare(`SELECT js.id,js.submission_reference,js.state,jp.display_name,js.prayer_purpose,jp.email_private,jp.phone_private,js.anonymous_public FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.idempotency_key_hash=? LIMIT 1`).bind(idem).first<Existing>();
      if(existing){
        const samePayload=existing.display_name===(displayName||"নাম প্রকাশ করা হয়নি") && (existing.prayer_purpose??null)===(prayerPurpose??null) && (existing.email_private??null)===(email??null) && (existing.phone_private??null)===(phone??null) && Number(existing.anonymous_public)===anonymous;
        if(!samePayload)return out(409,trace,null,{code:"IDEMPOTENCY_CONFLICT",message:"এই Idempotency-Key অন্য একটি অনুরোধের সঙ্গে যুক্ত।"});
        return out(200,trace,{submissionId:existing.id,submissionReference:existing.submission_reference,mode:"DAILY_JABA",state:existing.state,duplicate:true});
      }
    } catch { /* fall through to a safe dependency failure */ }
    return out(500,trace,null,{code:"INTERNAL_FAILURE",message:"দৈনিক জবার অংশগ্রহণ এখন সংরক্ষণ করা যাচ্ছে না।"});
  }
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { hashOpaqueToken } from "../../../../lib/files/auth/crypto";
import type { AuthDatabase } from "../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store, max-age=0", "Content-Type": "application/json; charset=utf-8", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
const MAX = { name: 160, gotra: 160, purpose: 1000, rashi: 80, nakshatra: 120, email: 254, phone: 32, instructions: 2000 } as const;
type Env = { DB?: AuthDatabase };
type Body = { cycleId?: unknown; name?: unknown; gotra?: unknown; prayerPurpose?: unknown; rashi?: unknown; nakshatra?: unknown; email?: unknown; phone?: unknown; specialInstructions?: unknown; anonymousPublic?: unknown };
type CycleRow = { id: string; cycle_slug: string; opens_at: string; closes_at: string | null; state: string; capacity: number | null; verified_participant_count: number };

function trace(request: Request): string { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
function out(status: number, traceId: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId } } : { ok: true, data, meta: { traceId } }, { status, headers: HEADERS }); }
function text(v: unknown, max: number): string | null { if (typeof v !== "string") return null; const s = v.trim(); return s && s.length <= max ? s : null; }
function email(v: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= MAX.email; }
async function parse(request: Request): Promise<Body | null> { const len=request.headers.get("content-length"); if(len&&(!/^\d+$/.test(len)||Number(len)>12000))return null; const raw=await request.text(); if(new TextEncoder().encode(raw).byteLength>12000)return null; try{const p:unknown=JSON.parse(raw);return p&&typeof p==="object"&&!Array.isArray(p)?p as Body:null;}catch{return null;} }
function yearIST(): string { const parts=new Intl.DateTimeFormat("en-IN",{timeZone:"Asia/Kolkata",year:"numeric"}).formatToParts(new Date()); return parts.find((p)=>p.type==="year")?.value ?? String(new Date().getUTCFullYear()); }
function digits(n:number): string { const bytes=crypto.getRandomValues(new Uint8Array(n)); return Array.from(bytes,(b)=>String(b%10)).join(""); }
function publicResponse(reference:string,id:string,state:string,verification:string){return {submissionId:id,submissionReference:reference,mode:"MONTHLY_AMAVASYA_JABA",state,verificationStatus:verification,donationRequired:false,message:"আপনার নামে এই অমাবস্যার পূজায় জবা নিবেদনের জন্য নিবন্ধন গ্রহণ করা হয়েছে।"};}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId=trace(request); const env=getCloudflareContext().env as unknown as Env; const db=env.DB; if(!db)return out(503,traceId,null,{code:"DEPENDENCY_FAILURE",message:"Monthly Jaba ব্যবস্থা এখন প্রস্তুত নয়।"});
  const body=await parse(request); const cycleId=text(body?.cycleId,128); const name=text(body?.name,MAX.name); const gotra=text(body?.gotra,MAX.gotra); const prayerPurpose=text(body?.prayerPurpose,MAX.purpose); const rashi=text(body?.rashi,MAX.rashi); const nakshatra=text(body?.nakshatra,MAX.nakshatra); const rawEmail=text(body?.email,MAX.email); const normalizedEmail=rawEmail?.toLowerCase()??null; const phone=text(body?.phone,MAX.phone); const instructions=text(body?.specialInstructions,MAX.instructions); const anonymousPublic=body?.anonymousPublic===undefined?true:body.anonymousPublic===true;
  const idempotency=request.headers.get("Idempotency-Key")?.trim()||null;
  if(!body||!name||!idempotency||idempotency.length<16||idempotency.length>200||(!cycleId&&cycleId!==null)|| (normalizedEmail&&!email(normalizedEmail)) || (body?.anonymousPublic!==undefined&&typeof body.anonymousPublic!=="boolean"))return out(400,traceId,null,{code:"INVALID_INPUT",message:"মাসিক জবা নিবন্ধনের তথ্য সঠিকভাবে দিতে হবে।"});
  try{
    const keyHash=await hashOpaqueToken(idempotency);
    const existing=await db.prepare(`SELECT js.id,js.submission_reference,js.state,js.prayer_purpose,js.anonymous_public,js.version,jp.display_name,jp.gotra,jp.rashi,jp.nakshatra,jp.email_private,jp.phone_private,jp.special_instructions_private FROM jaba_submissions js JOIN jaba_participants jp ON jp.id=js.participant_id WHERE js.idempotency_key_hash=? LIMIT 1`).bind(keyHash).first<{id:string;submission_reference:string;state:string;prayer_purpose:string|null;anonymous_public:number;version:number;display_name:string;gotra:string|null;rashi:string|null;nakshatra:string|null;email_private:string|null;phone_private:string|null;special_instructions_private:string|null}>();
    if(existing){
      const storedMatches=existing.display_name===name && (existing.gotra??null)===(gotra??null) && (existing.rashi??null)===(rashi??null) && (existing.nakshatra??null)===(nakshatra??null) && (existing.prayer_purpose??null)===(prayerPurpose??null) && (existing.email_private??null)===(normalizedEmail??null) && (existing.phone_private??null)===(phone??null) && (existing.special_instructions_private??null)===(instructions??null) && Number(existing.anonymous_public)===(anonymousPublic?1:0);
      if(!storedMatches)return out(409,traceId,null,{code:"IDEMPOTENCY_CONFLICT",message:"এই Idempotency-Key অন্য একটি অনুরোধের সঙ্গে যুক্ত।"});
      return out(200,traceId,{submissionId:existing.id,submissionReference:existing.submission_reference,mode:"MONTHLY_AMAVASYA_JABA",state:existing.state,verificationStatus:existing.state==="VERIFIED"?"VERIFIED":"PENDING",donationRequired:false,duplicate:true,version:existing.version});
    }
    const cycle=cycleId?await db.prepare(`SELECT id,cycle_slug,opens_at,closes_at,state,capacity,verified_participant_count FROM jaba_offering_cycles WHERE id=? LIMIT 1`).bind(cycleId).first<CycleRow>():await db.prepare(`SELECT id,cycle_slug,opens_at,closes_at,state,capacity,verified_participant_count FROM jaba_offering_cycles WHERE state IN ('OPEN','NEAR_CAPACITY') ORDER BY opens_at LIMIT 1`).first<CycleRow>();
    if(!cycle)return out(404,traceId,null,{code:"NO_OPEN_CYCLE",message:"এই মুহূর্তে কোনো সক্রিয় অমাবস্যা জবা নিবন্ধন খোলা নেই।"});
    if(!["OPEN","NEAR_CAPACITY"].includes(cycle.state))return out(409,traceId,null,{code:"CYCLE_NOT_OPEN",message:"নির্বাচিত অমাবস্যা জবা cycle এখন নিবন্ধনের জন্য খোলা নেই।"});
    const now=Date.now(); if(Date.parse(cycle.opens_at)>now||(cycle.closes_at&&Date.parse(cycle.closes_at)<=now))return out(409,traceId,null,{code:"CYCLE_CLOSED",message:"নির্বাচিত অমাবস্যা জবা cycle-এর সময়সীমা শেষ বা এখনও শুরু হয়নি।"});
    if(cycle.capacity!==null&&cycle.verified_participant_count>=cycle.capacity)return out(409,traceId,null,{code:"CAPACITY_REACHED",message:"এই cycle-এর configured capacity পূর্ণ হয়েছে।"});
    const participantId=crypto.randomUUID(); const submissionId=crypto.randomUUID(); const submissionReference=`JABA-${yearIST()}-${digits(6)}`; const revisionId=crypto.randomUUID(); const response=JSON.stringify({ok:true,data:publicResponse(submissionReference,submissionId,"IDENTITY_PENDING","PENDING"),meta:{traceId,identityVerificationRequired:true}});
    const nowTimestamp=new Date().toISOString();
    const participant=db.prepare(`INSERT INTO jaba_participants(id,display_name,gotra,rashi,nakshatra,prayer_purpose,email_private,phone_private,special_instructions_private,anonymous_public,verified_identity_key,identity_key_version,status,verification_status,revision_id,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,NULL,NULL,'ACTIVE','PENDING',?,1,?,?)`).bind(participantId,name,gotra,rashi,nakshatra,prayerPurpose,normalizedEmail,phone,instructions,anonymousPublic?1:0,revisionId,nowTimestamp,nowTimestamp);
    const submission=db.prepare(`INSERT INTO jaba_submissions(id,cycle_id,participant_id,mode,prayer_purpose,submission_reference,state,verification_status,idempotency_key_hash,verified_identity_key,donation_id,anonymous_public,submitted_at,verified_at,source_id,revision_id,version,created_at,updated_at) VALUES(?,?,?,?,?,?,?, ?,?,?,NULL,?, ?, NULL,NULL,?,1,?,?)`).bind(submissionId,cycle.id,participantId,"MONTHLY_AMAVASYA_JABA",prayerPurpose,submissionReference,"IDENTITY_PENDING","PENDING",keyHash,null,anonymousPublic?1:0,nowTimestamp,revisionId,nowTimestamp,nowTimestamp);
    try {
      const result=await db.batch([participant,submission]) as Array<{meta?:{changes?:number}}>;
      if(Number(result?.[1]?.meta?.changes??0)!==1)return out(409,traceId,null,{code:"WRITE_CONFLICT",message:"Monthly Jaba নিবন্ধন সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।"});
    } catch {
      const raced=await db.prepare(`SELECT id,submission_reference,state,prayer_purpose,anonymous_public,version FROM jaba_submissions WHERE idempotency_key_hash=? LIMIT 1`).bind(keyHash).first<{id:string;submission_reference:string;state:string;prayer_purpose:string|null;anonymous_public:number;version:number}>();
      if(raced && raced.prayer_purpose===(prayerPurpose??null) && Number(raced.anonymous_public)===(anonymousPublic?1:0))return out(200,traceId,{submissionId:raced.id,submissionReference:raced.submission_reference,mode:"MONTHLY_AMAVASYA_JABA",state:raced.state,verificationStatus:raced.state==="VERIFIED"?"VERIFIED":"PENDING",donationRequired:false,duplicate:true,version:raced.version});
      if(raced)return out(409,traceId,null,{code:"IDEMPOTENCY_CONFLICT",message:"এই Idempotency-Key অন্য একটি অনুরোধের সঙ্গে যুক্ত।"});
      return out(500,traceId,null,{code:"INTERNAL_FAILURE",message:"Monthly Jaba নিবন্ধন এখন সংরক্ষণ করা যাচ্ছে না।"});
    }
    return new NextResponse(response,{status:201,headers:HEADERS});
  }catch{
    return out(500,traceId,null,{code:"INTERNAL_FAILURE",message:"Monthly Jaba নিবন্ধন এখন সংরক্ষণ করা যাচ্ছে না।"});
  }
}

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/files/auth/session";
import { findUserById, getUserPermissions } from "../../../../../lib/files/auth/repository";
import { hashOpaqueToken, verifyPassword } from "../../../../../lib/files/auth/crypto";
import type { AuthDatabase, AuthSessionStore } from "../../../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT = 12000;
const MAX_BODY = 20000;
const HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
};

type Env = { DB?: AuthDatabase; SESSION_STORE?: AuthSessionStore; SESSION_COOKIE_NAME?: string };
type Body = { reference?: unknown; pin?: unknown; ticketId?: unknown; body?: unknown };
type TicketRow = { id: string; public_reference: string; tracking_pin_hash: string; status: string; requester_email_private: string; requester_name: string };
type SessionPrincipal = { userId: string; personId: string | null };

function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS }); }
function trace(request: Request) { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
async function bodyOf(request: Request): Promise<Body | null> { const len=request.headers.get("content-length"); if(len&&(!/^\d+$/.test(len)||Number(len)>BODY_LIMIT))return null; const raw=await request.text(); if(new TextEncoder().encode(raw).byteLength>BODY_LIMIT)return null; try{const p:unknown=JSON.parse(raw);return p&&typeof p==="object"&&!Array.isArray(p)?p as Body:null;}catch{return null;} }
function text(v:unknown,max:number){if(typeof v!=="string")return null;const s=v.trim();return s&&s.length<=max?s:null;}
function cookie(request: Request, name: string): string | null { const h=request.headers.get("cookie"); if(!h)return null; const m=h.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(`${name}=`)); return m?decodeURIComponent(m.slice(name.length+1)):null; }
async function staffPrincipal(db: AuthDatabase, store: AuthSessionStore | undefined, request: Request, cookieName: string): Promise<SessionPrincipal | null> {
  if(!store)return null; const token=cookie(request,cookieName); if(!token)return null; const s=await getSession(db,store,token); if(!s)return null; const user=await findUserById(db,s.userId); if(!user||user.status!=="ACTIVE"||!user.personId)return null; const perms=await getUserPermissions(db,s.userId); return perms.some((p)=>p.code==="support.reply")?{userId:user.id,personId:user.personId}:null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const traceId=trace(request); const runtime=getCloudflareContext().env as unknown as Env; const db=runtime.DB; if(!db)return out(503,traceId,null,{code:"DEPENDENCY_FAILURE",message:"বার্তা ব্যবস্থা এখন প্রস্তুত নয়।"});
  const body=await bodyOf(request); const message=text(body?.body,MAX_BODY); const reference=text(body?.reference,64); const pin=text(body?.pin,16); const ticketId=text(body?.ticketId,128);
  if(!body||!message||message.length<1)return out(400,traceId,null,{code:"INVALID_INPUT",message:"বার্তার বিষয়বস্তু দিতে হবে।"});
  try {
    const staff=await staffPrincipal(db,runtime.SESSION_STORE,request,runtime.SESSION_COOKIE_NAME?.trim()||"raksha_kali_session");
    let ticket: TicketRow | null=null; let authorType:"STAFF"|"REQUESTER"; let actorUserId:string|null=null; let authorVerified=false;
    if(staff && ticketId){ ticket=await db.prepare(`SELECT id,public_reference,tracking_pin_hash,status,requester_email_private,requester_name FROM support_tickets WHERE id=? LIMIT 1`).bind(ticketId).first<TicketRow>(); if(!ticket)return out(404,traceId,null,{code:"NOT_FOUND",message:"টিকিট পাওয়া যায়নি।"}); authorType="STAFF"; actorUserId=staff.userId; authorVerified=true; }
    else {
      if(!reference||!pin)return out(401,traceId,null,{code:"TRACKING_CREDENTIALS_REQUIRED",message:"বার্তা পাঠাতে Reference এবং ৪-সংখ্যার PIN দুটিই প্রয়োজন।"});
      ticket=await db.prepare(`SELECT id,public_reference,tracking_pin_hash,status,requester_email_private,requester_name FROM support_tickets WHERE public_reference=? LIMIT 1`).bind(reference).first<TicketRow>();
      if(!ticket)return out(404,traceId,null,{code:"NOT_FOUND",message:"টিকিট পাওয়া যায়নি।"});
      const validPin=await verifyPassword(pin,ticket.tracking_pin_hash); if(!validPin)return out(403,traceId,null,{code:"INVALID_PIN",message:"Reference বা PIN সঠিক নয়।"});
      authorType="REQUESTER"; authorVerified=true;
    }
    if(!authorVerified||!ticket)return out(403,traceId,null,{code:"FORBIDDEN",message:"এই বার্তার জন্য অনুমতি নেই।"});
    if(["REJECTED","CLOSED"].includes(ticket.status))return out(409,traceId,null,{code:"INVALID_STATE",message:"এই টিকিটে নতুন বার্তা গ্রহণ করা যাচ্ছে না।"});
    const messageId=crypto.randomUUID(); const idemHeader=request.headers.get("Idempotency-Key")?.trim()||null; const messageIdem=idemHeader?await hashOpaqueToken(idemHeader):await hashOpaqueToken(`${ticket.id}:${authorType}:${message}`);
    const existing=await db.prepare(`SELECT id,body_private FROM support_messages WHERE idempotency_key_hash=? LIMIT 1`).bind(messageIdem).first<{id:string;body_private:string}>();
    if(existing)return out(200,traceId,{messageId:existing.id,visibility:"PUBLIC_REPLY",status:"STORED",duplicate:true});

    const revision=crypto.randomUUID();
    const statements=[
      db.prepare(`INSERT INTO support_messages(id,ticket_id,author_user_id,author_type,visibility,body_private,idempotency_key_hash,created_at,updated_at,revision_id) VALUES(?,?,?,'${authorType}','PUBLIC_REPLY',?,?,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,?)`).bind(messageId,ticket.id,actorUserId,message,messageIdem,revision),
      db.prepare(`INSERT INTO support_audit_events(id,ticket_id,message_id,actor_user_id,actor_role,action,entity_type,entity_id,before_json,after_json,reason_code,idempotency_key_hash,metadata_json) VALUES(?,?,?,?,?,'MESSAGE_CREATE','SupportMessage',?,NULL,?,?,?,?)`).bind(crypto.randomUUID(),ticket.id,messageId,actorUserId,authorType,messageId,JSON.stringify({visibility:"PUBLIC_REPLY",authorType}),"SUPPORT_REPLY",messageIdem,JSON.stringify({traceId})),
    ];
    if(authorType==="STAFF"){
      const sender=await db.prepare(`SELECT id,from_address_private,reply_to_address_private FROM email_sender_profiles WHERE environment_scope='PRODUCTION' AND enabled=1 AND provider_verified=1 AND verification_status='VERIFIED' LIMIT 1`).first<{id:string;from_address_private:string;reply_to_address_private:string|null}>();
      const template=await db.prepare(`SELECT id,version,subject_template,body_template_private FROM email_templates WHERE purpose='STAFF_REPLY' AND locale IN ('bn-IN','bn') AND enabled=1 ORDER BY version DESC LIMIT 1`).first<{id:string;version:number;subject_template:string;body_template_private:string}>();
      if(sender&&template){
        const logical=await hashOpaqueToken(`STAFF_REPLY:${ticket.id}:${messageId}`); const dispatch=await hashOpaqueToken(`DISPATCH:${ticket.id}:${messageId}`); const subject=template.subject_template.replace(/\{\{\s*publicReference\s*\}\}/g,ticket.public_reference); const content=template.body_template_private.replace(/\{\{\s*publicReference\s*\}\}/g,ticket.public_reference).replace(/\{\{\s*message\s*\}\}/g,message);
        statements.push(db.prepare(`INSERT INTO email_dispatches(id,logical_notification_key_hash,idempotency_key_hash,ticket_id,message_id,destination_id,sender_profile_id,template_id,template_version,provider_code,recipient_address_private,recipient_address_normalized,subject_private,body_private,environment_scope,status,queued_at,created_at,updated_at) VALUES(?,?,?,?,?,NULL,?,?,?,'RESEND',?,?,?,?,?,'QUEUED',CURRENT_TIMESTAMP,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)`).bind(crypto.randomUUID(),logical,dispatch,ticket.id,messageId,null,sender.id,template.id,template.version,ticket.requester_email_private,ticket.requester_email_private,subject,content,"PRODUCTION"));
      }
    }
    const result=await db.batch(statements); const changes=Number((result[0] as {meta?:{changes?:number}})?.meta?.changes??0); if(changes!==1)return out(409,traceId,null,{code:"WRITE_CONFLICT",message:"বার্তাটি একই সময়ে পরিবর্তিত হয়েছে। আবার চেষ্টা করুন।"});
    return out(201,traceId,{messageId,visibility:"PUBLIC_REPLY",status:"STORED"});
  } catch { return out(500,traceId,null,{code:"INTERNAL_FAILURE",message:"বার্তা এখন সংরক্ষণ করা যাচ্ছে না।"}); }
}

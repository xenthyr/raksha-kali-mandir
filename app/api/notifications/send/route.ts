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
type Body = { notificationId?: unknown };
type NotificationRow = { id: string; notification_type: string; title_bn: string; body_bn: string; status: string; dedupe_key: string; scheduled_at: string | null; expires_at: string | null; version: number; verification_status: string; audience_code: string };
type Subscription = { id: string };

function traceId(request: Request): string { const v = request.headers.get("x-request-id")?.trim(); return v && v.length <= 128 ? v : crypto.randomUUID(); }
function out(status: number, trace: string, data: unknown, error?: { code: string; message: string }): NextResponse { return NextResponse.json(error ? { ok: false, error, meta: { traceId: trace } } : { ok: true, data, meta: { traceId: trace } }, { status, headers: HEADERS }); }
function cookie(request: Request, name: string): string | null { const raw=request.headers.get("cookie"); if(!raw)return null; const match=raw.split(";").map((x)=>x.trim()).find((x)=>x.startsWith(`${name}=`)); return match ? decodeURIComponent(match.slice(name.length+1)) : null; }
async function parse(request: Request): Promise<Body|null>{ const raw=await request.text(); if(raw.length>8192)return null; try{const p:unknown=JSON.parse(raw);return p&&typeof p==="object"&&!Array.isArray(p)?p as Body:null;}catch{return null;} }
function text(v:unknown,max:number){if(typeof v!=="string")return null;const s=v.trim();return s&&s.length<=max?s:null;}

async function authorized(env: Env, request: Request): Promise<string | null> {
  if (!env.DB || !env.SESSION_STORE) return null;
  const token=cookie(request, env.SESSION_COOKIE_NAME?.trim() || "raksha_kali_session");
  if(!token)return null;
  const session=await getSession(env.DB,env.SESSION_STORE,token);
  if(!session)return null;
  const user=await findUserById(env.DB,session.userId);
  if(!user||user.status!=="ACTIVE")return null;
  const permissions=await getUserPermissions(env.DB,user.id);
  return permissions.some((p)=>p.code==="notification.send") ? user.id : null;
}

export async function POST(request: Request): Promise<NextResponse> {
  const trace=traceId(request); const env=getCloudflareContext().env as unknown as Env; if(!env.DB)return out(503,trace,null,{code:"DEPENDENCY_FAILURE",message:"নোটিফিকেশন ব্যবস্থা এখন প্রস্তুত নয়।"});
  const actor=await authorized(env,request); if(!actor)return out(403,trace,null,{code:"FORBIDDEN",message:"নোটিফিকেশন পাঠানোর অনুমতি আপনার নেই।"});
  const body=await parse(request); const notificationId=text(body?.notificationId,128); if(!notificationId)return out(400,trace,null,{code:"INVALID_INPUT",message:"Notification ID দিতে হবে।"});
  const idem=request.headers.get("Idempotency-Key")?.trim(); if(!idem||idem.length<16||idem.length>200)return out(400,trace,null,{code:"IDEMPOTENCY_KEY_REQUIRED",message:"Idempotency-Key দিতে হবে।"});
  try {
    const notification=await env.DB.prepare(`SELECT id,notification_type,title_bn,body_bn,status,dedupe_key,scheduled_at,expires_at,version,verification_status,audience_code FROM notifications WHERE id=? LIMIT 1`).bind(notificationId).first<NotificationRow>();
    if(!notification)return out(404,trace,null,{code:"NOT_FOUND",message:"নোটিফিকেশন পাওয়া যায়নি।"});
    if(notification.audience_code!=="PUBLIC")return out(403,trace,null,{code:"AUDIENCE_NOT_ALLOWED",message:"এই নোটিফিকেশন public audience-এর জন্য অনুমোদিত নয়।"});
    if(notification.verification_status!=="VERIFIED")return out(409,trace,null,{code:"NOT_VERIFIED",message:"নোটিফিকেশন আগে যাচাই করতে হবে।"});
    if(["SENT","ARCHIVED","CANCELLED"].includes(notification.status))return out(409,trace,null,{code:"INVALID_STATE",message:"এই নোটিফিকেশন এখন পাঠানো যাবে না।"});
    if(notification.expires_at && new Date(notification.expires_at).getTime()<Date.now())return out(409,trace,null,{code:"EXPIRED",message:"নোটিফিকেশনের মেয়াদ শেষ হয়েছে।"});
    const idemHash=await hashOpaqueToken(idem);
    const subs=await env.DB.prepare(
      `SELECT id FROM notification_subscriptions
       WHERE permission_status='GRANTED' AND enabled=1 AND revoked_at IS NULL
         AND CASE notification_type WHEN 'AMAVASYA' THEN amavasya_enabled WHEN 'SPECIAL_PUJA' THEN special_puja_enabled
              WHEN 'FESTIVAL' THEN festival_enabled WHEN 'OFFICIAL_NOTICE' THEN notice_enabled
              WHEN 'LIVE_EVENT' THEN live_enabled WHEN 'VOLUNTEER_DUTY' THEN volunteer_enabled
              WHEN 'EMERGENCY' THEN emergency_enabled ELSE 0 END = 1`,
    ).all<Subscription>();
    const uniqueSubscriptions=new Map(subs.results.map((s)=>[s.id,s]));
    const now=new Date().toISOString();
    if(notification.status!=="QUEUED"){
      const update=await env.DB.prepare(`UPDATE notifications SET status='QUEUED',queued_at=?,updated_at=?,revision_id=?,version=version+1 WHERE id=? AND version=? AND status IN ('DRAFT','SCHEDULED','SENDING')`).bind(now,now,crypto.randomUUID(),notification.id,notification.version).run();
      if((update.meta?.changes??0)!==1)return out(409,trace,null,{code:"STALE_NOTIFICATION",message:"নোটিফিকেশনটি একই সময়ে পরিবর্তিত হয়েছে।"});
    }
    const dispatches=Array.from(uniqueSubscriptions.values()).map((sub)=>{
      const key=`${notification.id}:${sub.id}`;
      return env.DB!.prepare(`INSERT INTO notification_dispatches(id,notification_id,subscription_id,channel,status,idempotency_key,attempt_count,queued_at,created_at,updated_at) VALUES(?,?,?,'PUSH','QUEUED',?,0,?,?,?) ON CONFLICT(notification_id,subscription_id,channel) DO NOTHING`).bind(crypto.randomUUID(),notification.id,sub.id,key,now,now,now);
    });
    if(dispatches.length>0)await env.DB.batch(dispatches);
    const auditKey=await hashOpaqueToken(`NOTIFICATION_SEND:${notification.id}:${notification.version}:${idemHash}`);
    await env.DB.prepare(`INSERT INTO audit_logs(id,actor_user_id,actor_role_code,action,entity_type,entity_id,result,after_json_private,reason_private,request_id,occurred_at,created_at) VALUES(?,?,?,?,?,?, 'SUCCESS',?,?,?,?,?) ON CONFLICT(id) DO NOTHING`).bind(crypto.randomUUID(),actor,"notification.send","SEND_QUEUED","Notification",notification.id,"QUEUED",JSON.stringify({subscriptionCount:uniqueSubscriptions.size,dispatchState:"QUEUED",auditKey}),"NOTIFICATION_SEND",trace,now,now).run();
    return out(200,trace,{notificationId:notification.id,status:"QUEUED",subscriptionCount:uniqueSubscriptions.size,deliveryProvider:"PUSH_QUEUE"});
  } catch { return out(500,trace,null,{code:"INTERNAL_FAILURE",message:"নোটিফিকেশন queue করা যায়নি।"}); }
}

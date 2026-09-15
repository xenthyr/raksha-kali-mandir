import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { CANONICAL } from "../../../../lib/config/canonical";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const BODY_LIMIT=8192;
const IDEMPOTENCY_LIMIT=128;
const JSON_HEADERS={"Cache-Control":"no-store, max-age=0","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
interface Env{DB?:D1Like;}
interface DonationConfigRow{id:string;official_upi_vpa:string;payee_name:string;transaction_note:string;minimum_amount_paise:number;suggested_amounts_json:string;methods_json:string;status:string;effective_from:string;effective_to:string|null;version:number;verification_status:string;}
interface AttemptRow{client_idempotency_key:string;donation_id:string;amount_paise:number;method:string;purpose_code:string;status:string;public_reference:string;currency:string;}
interface CreatedDonation{id:string;public_reference:string;amount_paise:number;currency:string;method:string;purpose_code:string;status:string;}
function traceId(request:Request):string{const v=request.headers.get("x-request-id")?.trim();return v&&v.length<=128?v:crypto.randomUUID();}
function err(status:number,trace:string,code:string,message:string):NextResponse{return NextResponse.json({ok:false,error:{code,message},meta:{traceId:trace}},{status,headers:JSON_HEADERS});}
function str(value:unknown,max:number):string|null{if(typeof value!=="string")return null;const v=value.trim();return v&&v.length<=max?v:null;}
function validEmail(value:string|null):boolean{return value===null||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);}
function validPhone(value:string|null):boolean{return value===null||/^\+?[0-9][0-9 ()-]{5,30}$/.test(value);}
function normalizePurpose(value:unknown):string|null{const v=str(value,64);return v&&/^[A-Z0-9][A-Z0-9_-]*$/.test(v)?v:null;}
function positivePaise(value:unknown):number|null{if(typeof value!=="number"||!Number.isSafeInteger(value)||value<=0)return null;return value;}
function parseJsonArray(value:string):string[]{const parsed:unknown=JSON.parse(value);if(!Array.isArray(parsed)||!parsed.every((x):x is string=>typeof x==="string"))throw new Error("CONFIG_JSON_INVALID");return parsed;}
async function parseBody(request:Request):Promise<Record<string,unknown>|null>{const length=request.headers.get("content-length");if(length&&Number(length)>BODY_LIMIT)return null;const text=await request.text();if(new TextEncoder().encode(text).byteLength>BODY_LIMIT)return null;try{const parsed:unknown=JSON.parse(text);return parsed&&typeof parsed==="object"&&!Array.isArray(parsed)?parsed as Record<string,unknown>:null;}catch{return null;}}

export async function POST(request:Request):Promise<NextResponse>{
  const trace=traceId(request);const env=getCloudflareContext().env as unknown as Env;if(!env.DB)return err(503,trace,"DEPENDENCY_FAILURE","দান করার ব্যবস্থা সাময়িকভাবে পাওয়া যাচ্ছে না.");
  const body=await parseBody(request);if(!body)return err(400,trace,"INVALID_BODY","অনুরোধের তথ্য সঠিক নয়।");
  const amountPaise=positivePaise(body.amountPaise);const purposeCode=normalizePurpose(body.purposeCode);const methodValue=str(body.method,16);const method=methodValue==="CASH"||methodValue==="UPI"?methodValue:"UPI";
  if(amountPaise===null||purposeCode===null)return err(400,trace,"INVALID_INPUT","পরিমাণ ও উদ্দেশ্য সঠিকভাবে দিন।");
  const donorName=str(body.donorName,160);const donorEmail=str(body.donorEmail,254);const donorPhone=str(body.donorPhone,32);if(!validEmail(donorEmail)||!validPhone(donorPhone))return err(400,trace,"INVALID_DONOR_CONTACT","যোগাযোগের তথ্য সঠিক নয়।");const idemRaw=request.headers.get("Idempotency-Key")?.trim()||`generated-${crypto.randomUUID()}`;if(idemRaw.length>IDEMPOTENCY_LIMIT)return err(400,trace,"INVALID_IDEMPOTENCY_KEY","Idempotency-Key খুব বড়।");
  try{
    const existing=await env.DB.prepare(`SELECT da.client_idempotency_key,da.donation_id,da.amount_paise,da.method,d.purpose_code,da.status,d.public_reference,d.currency FROM donation_attempts da JOIN donations d ON d.id=da.donation_id WHERE da.client_idempotency_key=? LIMIT 1`).bind(idemRaw).first<AttemptRow>();
    if(existing){if(existing.amount_paise!==amountPaise||existing.method!==method||existing.purpose_code!==purposeCode)return err(409,trace,"IDEMPOTENCY_CONFLICT","একই Idempotency-Key-এর সঙ্গে ভিন্ন দানের তথ্য ব্যবহার করা হয়েছে।");return NextResponse.json({ok:true,data:{donationId:existing.donation_id,publicReference:existing.public_reference,amountPaise:existing.amount_paise,currency:existing.currency,method:existing.method,purposeCode:existing.purpose_code,status:existing.status,replayed:true},meta:{traceId:trace}},{status:200,headers:JSON_HEADERS});}
    const config=await env.DB.prepare(`SELECT id,official_upi_vpa,payee_name,transaction_note,minimum_amount_paise,suggested_amounts_json,methods_json,status,effective_from,effective_to,version,verification_status FROM donation_configs WHERE id=? AND status='CURRENT' AND effective_from<=CURRENT_TIMESTAMP AND (effective_to IS NULL OR effective_to>=CURRENT_TIMESTAMP) LIMIT 1`).bind(CANONICAL.donationConfigId).first<DonationConfigRow>();
    if(!config||config.verification_status!=="VERIFIED")return err(503,trace,"DONATION_CONFIG_UNAVAILABLE","দান কনফিগারেশন যাচাই করা যায়নি।");
    if(amountPaise<config.minimum_amount_paise)return err(400,trace,"AMOUNT_BELOW_MINIMUM","ন্যূনতম দানের পরিমাণের কম গ্রহণ করা যাবে না।");
    const methods=parseJsonArray(config.methods_json);if(!methods.includes(method))return err(400,trace,"METHOD_NOT_SUPPORTED","এই পেমেন্ট পদ্ধতি বর্তমানে গ্রহণযোগ্য নয়।");
    const donationId=crypto.randomUUID();const attemptId=crypto.randomUUID();const businessYear=new Intl.DateTimeFormat("en-US",{timeZone:CANONICAL.timezone,year:"numeric"}).format(new Date());
    const donationInsert=env.DB.prepare(`INSERT INTO donations (id,temple_id,config_id,public_reference,donor_name_private,donor_email_private,donor_phone_private,purpose_code,amount_paise,currency,method,status,revision_id,version) SELECT ?,?,?,printf('MRK-%04d-%06d',CAST(? AS INTEGER),COALESCE(MAX(CAST(substr(public_reference,10,6) AS INTEGER)),0)+1),?,?,?,?,?,'INR',?,'CREATED',NULL,1 FROM donations WHERE public_reference LIKE 'MRK-'||?||'-%' AND deleted_at IS NULL`);
    const attemptInsert=env.DB.prepare(`INSERT INTO donation_attempts (id,donation_id,method,status,client_idempotency_key,amount_paise,currency) VALUES (?,?,?,'INITIATED',?,?,'INR')`).bind(attemptId,donationId,method,idemRaw,amountPaise);
    await env.DB.batch([donationInsert.bind(donationId,CANONICAL.templeId,CANONICAL.donationConfigId,businessYear,donorName,donorEmail,donorPhone,purposeCode,amountPaise,method,businessYear),attemptInsert]);
    const created=await env.DB.prepare(`SELECT id,public_reference,amount_paise,currency,method,purpose_code,status FROM donations WHERE id=? AND deleted_at IS NULL LIMIT 1`).bind(donationId).first<CreatedDonation>();
    if(!created)throw new Error("CREATED_DONATION_NOT_FOUND");
    return NextResponse.json({ok:true,data:{donationId:created.id,publicReference:created.public_reference,amountPaise:created.amount_paise,currency:created.currency,method:created.method,purposeCode:created.purpose_code,status:created.status,replayed:false,paymentConfig:{upiVpa:config.official_upi_vpa,payeeName:config.payee_name,transactionNote:config.transaction_note}},meta:{traceId:trace,configId:config.id,configVersion:config.version}},{status:201,headers:JSON_HEADERS});
  }catch(error){
    const existingAfterFailure=await env.DB.prepare(`SELECT da.client_idempotency_key,da.donation_id,da.amount_paise,da.method,d.purpose_code,da.status,d.public_reference,d.currency FROM donation_attempts da JOIN donations d ON d.id=da.donation_id WHERE da.client_idempotency_key=? LIMIT 1`).bind(idemRaw).first<AttemptRow>().catch(()=>null);
    if(existingAfterFailure&&existingAfterFailure.amount_paise===amountPaise&&existingAfterFailure.method===method&&existingAfterFailure.purpose_code===purposeCode)return NextResponse.json({ok:true,data:{donationId:existingAfterFailure.donation_id,publicReference:existingAfterFailure.public_reference,amountPaise:existingAfterFailure.amount_paise,currency:existingAfterFailure.currency,method:existingAfterFailure.method,purposeCode:existingAfterFailure.purpose_code,status:existingAfterFailure.status,replayed:true},meta:{traceId:trace}},{status:200,headers:JSON_HEADERS});
    const msg=error instanceof Error?error.message:"UNKNOWN";const conflict=msg.includes("UNIQUE")||msg.includes("constraint")||msg.includes("CONSTRAINT");return err(msg==="CREATED_DONATION_NOT_FOUND"?502:conflict?409:503,trace,msg==="CREATED_DONATION_NOT_FOUND"?"WRITE_FAILURE":conflict?"WRITE_CONFLICT":"DEPENDENCY_FAILURE",msg==="CREATED_DONATION_NOT_FOUND"?"দানের রেকর্ড তৈরি নিশ্চিত করা যায়নি।":conflict?"অনুরোধের অনন্য শনাক্তকরণে সংঘাত হয়েছে; আবার চেষ্টা করুন।":"দান রেকর্ড তৈরি করা যাচ্ছে না।");
  }
}

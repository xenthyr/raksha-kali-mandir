import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { CANONICAL, PANJIKA_OPERATIONAL_END, PANJIKA_OPERATIONAL_START } from "../../../../lib/config/canonical";
import { calendarRepository } from "../../../../db/repositories/calendar";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DATE_RE=/^\d{4}-\d{2}-\d{2}$/;
const JSON_HEADERS={"Cache-Control":"public, max-age=300, s-maxage=300, stale-while-revalidate=600","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff"};
interface Env{DB?:D1Like;}
interface AmavasyaRow{ id:string; slug:string; display_name_bn:string; display_name_en:string; bengali_year:number; bengali_month:string; gregorian_date:string; tithi_start:string; tithi_end:string; timezone:string; paksha:string; special_puja_id:string|null; temple_observance_id:string|null; schedule_id:string|null; source_ids_json:string; verification_status:string; calculation_version:string; content_version:string; status:string; version:number; revision_id:string|null; published_at:string|null; }
function traceId(request:Request):string{const v=request.headers.get("x-request-id")?.trim();return v&&v.length<=128?v:crypto.randomUUID();}
function err(status:number,trace:string,code:string,message:string):NextResponse{return NextResponse.json({ok:false,error:{code,message},meta:{traceId:trace}},{status,headers:JSON_HEADERS});}
function validDate(v:string):boolean{if(!DATE_RE.test(v))return false;const d=new Date(`${v}T00:00:00Z`);return !Number.isNaN(d.getTime())&&d.toISOString().slice(0,10)===v;}
function parseSources(v:string):string[]{let parsed:unknown;try{parsed=JSON.parse(v);}catch{throw new Error("INVALID_SOURCE_METADATA");}if(!Array.isArray(parsed)||!parsed.every((x):x is string=>typeof x==="string"&&x.length>0))throw new Error("INVALID_SOURCE_METADATA");return[...new Set(parsed)];}

export async function GET(request:Request):Promise<NextResponse>{
  const trace=traceId(request);const env=getCloudflareContext().env as unknown as Env;if(!env.DB)return err(503,trace,"DEPENDENCY_FAILURE","অমাবস্যার তথ্য সাময়িকভাবে পাওয়া যাচ্ছে না।");
  const params=new URL(request.url).searchParams;const from=params.get("from")?.trim()||PANJIKA_OPERATIONAL_START;const to=params.get("to")?.trim()||PANJIKA_OPERATIONAL_END;const limitRaw=params.get("limit")?.trim()||"20";const limit=Number(limitRaw);
  if(!validDate(from)||!validDate(to)||from>to)return err(400,trace,"INVALID_RANGE","সঠিক তারিখের পরিসর দিন।");
  if(from<PANJIKA_OPERATIONAL_START||to>PANJIKA_OPERATIONAL_END)return err(400,trace,"RANGE_OUT_OF_SCOPE","তারিখের পরিসর বর্তমান ১৪৩৩ পঞ্জিকা সীমার মধ্যে হতে হবে।");
  if(!Number.isInteger(limit)||limit<1||limit>50)return err(400,trace,"INVALID_LIMIT","limit 1 থেকে 50-এর মধ্যে হতে হবে।");
  try{
    const year=await calendarRepository.getPanjikaYear(env.DB,CANONICAL.panjikaId);
    if(!year||year.status!=="ACTIVE"||year.bengali_year!==1433||year.calendar_system!=="Bisuddha Siddhanta"||year.calculation_version!==CANONICAL.panjikaCalculationVersion||year.timezone!==CANONICAL.timezone||year.operational_start!==PANJIKA_OPERATIONAL_START||year.operational_end!==PANJIKA_OPERATIONAL_END)throw new Error("PANJIKA_READ_MODEL_INVALID");
    const rows=await env.DB.prepare(`SELECT id,slug,display_name_bn,display_name_en,bengali_year,bengali_month,gregorian_date,tithi_start,tithi_end,timezone,paksha,special_puja_id,temple_observance_id,schedule_id,source_ids_json,verification_status,calculation_version,content_version,status,version,revision_id,published_at FROM amavasyas WHERE bengali_year=1433 AND status='PUBLISHED' AND gregorian_date>=? AND gregorian_date<=? AND calculation_version=? ORDER BY gregorian_date,id LIMIT ?`).bind(from,to,CANONICAL.panjikaCalculationVersion,limit).all<AmavasyaRow>();
    const items=rows.results.map(row=>{if(row.bengali_year!==1433||row.timezone!==CANONICAL.timezone||row.paksha!=="KRISHNA"||row.calculation_version!==CANONICAL.panjikaCalculationVersion||row.verification_status!=="VERIFIED")throw new Error("AMAVASYA_RECORD_INVALID");const sourceIds=parseSources(row.source_ids_json);if(!sourceIds.length)throw new Error("AMAVASYA_SOURCE_MISSING");return{id:row.id,slug:row.slug,nameBn:row.display_name_bn,nameEn:row.display_name_en,bengaliYear:row.bengali_year,bengaliMonth:row.bengali_month,gregorianDate:row.gregorian_date,tithi:{startsAt:row.tithi_start,endsAt:row.tithi_end},timezone:row.timezone,paksha:row.paksha,calculationVersion:row.calculation_version,sourceIds,sourceId:sourceIds[0],verificationStatus:row.verification_status,templeObservanceId:row.temple_observance_id,specialPujaId:row.special_puja_id,publishedAt:row.published_at,contentVersion:row.content_version,version:row.version,revisionId:row.revision_id};});
    return NextResponse.json({ok:true,data:{panjikaYearId:CANONICAL.panjikaId,calculationVersion:CANONICAL.panjikaCalculationVersion,items},meta:{traceId:trace,empty:items.length===0}},{status:200,headers:JSON_HEADERS});
  }catch{return err(502,trace,"READ_MODEL_FAILURE","অমাবস্যার ক্যানোনিক্যাল রেকর্ড যাচাই করা যায়নি।");}
}

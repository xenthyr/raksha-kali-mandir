import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { CANONICAL, PANJIKA_OPERATIONAL_END, PANJIKA_OPERATIONAL_START } from "../../../../lib/config/canonical";
import { calendarRepository } from "../../../../db/repositories/calendar";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

interface Env { DB?: D1Like; }
interface TodayRow {
  id: string; panjika_year_id: string; day_number: number; bengali_year: number; bengali_month: number; bengali_day: number;
  gregorian_date: string; weekday: number; paksha: string; tithi_id: string | null; tithi_start: string; tithi_end: string;
  nakshatra_id: string | null; nakshatra_start: string; nakshatra_end: string; sunrise: string | null; sunset: string | null;
  calendar_system: string; calculation_version: string; calculation_status: string; verification_status: string; source_ids_json: string; status: string;
}
interface TithiRow { id:string; code:string; name_bn:string; name_en:string; paksha:string; status:string; verification_status:string; }
function traceId(request: Request): string { const v=request.headers.get("x-request-id")?.trim(); return v&&v.length<=128?v:crypto.randomUUID(); }
function err(status:number,trace:string,code:string,message:string):NextResponse { return NextResponse.json({ok:false,error:{code,message},meta:{traceId:trace}},{status,headers:JSON_HEADERS}); }
function currentDateKolkata(): string { return new Intl.DateTimeFormat("en-CA",{timeZone:CANONICAL.timezone,year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()); }
function parseSources(value:string):string[]{ const parsed:unknown=JSON.parse(value); if(!Array.isArray(parsed)||!parsed.every((x):x is string=>typeof x==="string"&&x.length>0)) throw new Error("INVALID_SOURCE_METADATA"); return [...new Set(parsed)]; }

export async function GET(request: Request): Promise<NextResponse> {
  const trace=traceId(request);
  const env=getCloudflareContext().env as unknown as Env;
  if(!env.DB) return err(503,trace,"DEPENDENCY_FAILURE","আজকের পঞ্জিকা তথ্য সাময়িকভাবে পাওয়া যাচ্ছে না।");
  const date=currentDateKolkata();
  if(date<PANJIKA_OPERATIONAL_START||date>PANJIKA_OPERATIONAL_END) return err(404,trace,"CURRENT_DATE_OUT_OF_RANGE","আজকের তারিখ বর্তমান ১৪৩৩ পঞ্জিকা পরিসরের বাইরে।");
  try {
    const year=await calendarRepository.getPanjikaYear(env.DB,CANONICAL.panjikaId);
    if(!year||year.status!=="ACTIVE"||year.bengali_year!==1433||year.calendar_system!=="Bisuddha Siddhanta"||year.calculation_version!==CANONICAL.panjikaCalculationVersion||year.timezone!==CANONICAL.timezone||year.operational_start!==PANJIKA_OPERATIONAL_START||year.operational_end!==PANJIKA_OPERATIONAL_END) throw new Error("PANJIKA_READ_MODEL_INVALID");
    const day=await env.DB.prepare(`SELECT id,panjika_year_id,day_number,bengali_year,bengali_month,bengali_day,gregorian_date,weekday,paksha,tithi_id,tithi_start,tithi_end,nakshatra_id,nakshatra_start,nakshatra_end,sunrise,sunset,calendar_system,calculation_version,calculation_status,verification_status,source_ids_json,status FROM panjika_days WHERE panjika_year_id=? AND gregorian_date=? AND status='ACTIVE' LIMIT 1`).bind(CANONICAL.panjikaId,date).first<TodayRow>();
    if(!day) return err(404,trace,"NOT_FOUND","আজকের পঞ্জিকা রেকর্ড পাওয়া যায়নি।");
    if(day.bengali_year!==1433||day.calculation_version!==CANONICAL.panjikaCalculationVersion||day.calculation_status!=="CANONICAL_REGIONAL_CALCULATION"||day.calendar_system!=="Bisuddha Siddhanta"||day.verification_status==="REJECTED"||!day.tithi_id||!day.nakshatra_id) throw new Error("PANJIKA_RECORD_INVALID");
    const tithi=await env.DB.prepare(`SELECT id,code,name_bn,name_en,paksha,status,verification_status FROM tithis WHERE id=? LIMIT 1`).bind(day.tithi_id).first<TithiRow>();
    if(!tithi||tithi.status!=="ACTIVE"||tithi.verification_status==="REJECTED") throw new Error("TITHI_REFERENCE_INVALID");
    let sourceIds:string[]; try { sourceIds=parseSources(day.source_ids_json); } catch { throw new Error("INVALID_SOURCE_METADATA"); }
    if(sourceIds.length===0) throw new Error("PANJIKA_SOURCE_MISSING");
    const data={id:day.id,panjikaYearId:CANONICAL.panjikaId,dayNumber:day.day_number,bengaliYear:day.bengali_year,bengaliMonth:day.bengali_month,bengaliDay:day.bengali_day,gregorianDate:day.gregorian_date,weekday:day.weekday,paksha:day.paksha,tithi:{id:tithi.id,code:tithi.code,nameBn:tithi.name_bn,nameEn:tithi.name_en,paksha:tithi.paksha,startsAt:day.tithi_start,endsAt:day.tithi_end},nakshatra:{id:day.nakshatra_id,startsAt:day.nakshatra_start,endsAt:day.nakshatra_end},sunrise:day.sunrise,sunset:day.sunset,calendarSystem:day.calendar_system,calculationVersion:day.calculation_version,calculationStatus:day.calculation_status,sourceIds,sourceId:sourceIds[0]??null,timezone:CANONICAL.timezone,verificationStatus:day.verification_status};
    return NextResponse.json({ok:true,data,meta:{traceId:trace,source:"PANJIKA-Y1433"}},{status:200,headers:JSON_HEADERS});
  } catch { return err(502,trace,"READ_MODEL_FAILURE","আজকের পঞ্জিকা রেকর্ড যাচাই করা যায়নি।"); }
}

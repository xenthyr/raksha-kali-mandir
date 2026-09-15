import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { CANONICAL, PANJIKA_OPERATIONAL_END, PANJIKA_OPERATIONAL_START } from "../../../../lib/config/canonical";
import { calendarRepository } from "../../../../db/repositories/calendar";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const JSON_HEADERS = {
  "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=600",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
};

interface CalendarRuntimeEnv { DB?: D1Like; }
interface DayReadRow {
  id: string;
  panjika_year_id: string;
  day_number: number;
  bengali_year: number;
  bengali_month: number;
  bengali_day: number;
  gregorian_date: string;
  weekday: number;
  paksha: string;
  tithi_id: string | null;
  tithi_start: string;
  tithi_end: string;
  nakshatra_id: string | null;
  nakshatra_start: string;
  nakshatra_end: string;
  sunrise: string | null;
  sunset: string | null;
  calendar_system: string;
  calculation_version: string;
  calculation_status: string;
  verification_status: string;
  source_ids_json: string;
  status: string;
}
interface TithiReadRow {
  id: string;
  code: string;
  name_bn: string;
  name_en: string;
  paksha: string;
  status: string;
  verification_status: string;
}

function traceId(request: Request): string {
  const supplied = request.headers.get("x-request-id")?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function errorResponse(status: number, trace: string, code: string, message: string): NextResponse {
  return NextResponse.json({ ok: false, error: { code, message }, meta: { traceId: trace } }, { status, headers: JSON_HEADERS });
}

function validIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function todayInKolkata(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: CANONICAL.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function parseSourceIds(raw: string): string[] {
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every((item): item is string => typeof item === "string" && item.length > 0)) throw new Error("INVALID_SOURCE_IDS");
    return [...new Set(value)];
  } catch {
    throw new Error("INVALID_SOURCE_METADATA");
  }
}

async function loadReadModel(db: D1Like, date: string): Promise<{ year: Awaited<ReturnType<typeof calendarRepository.getPanjikaYear>>; day: DayReadRow | null; tithi: TithiReadRow | null }> {
  const year = await calendarRepository.getPanjikaYear(db, CANONICAL.panjikaId);
  if (!year || year.status !== "ACTIVE" || year.bengali_year !== 1433 || year.calendar_system !== "Bisuddha Siddhanta" || year.calculation_version !== CANONICAL.panjikaCalculationVersion || year.timezone !== CANONICAL.timezone || year.operational_start !== PANJIKA_OPERATIONAL_START || year.operational_end !== PANJIKA_OPERATIONAL_END) {
    throw new Error("PANJIKA_READ_MODEL_INVALID");
  }

  // Compatibility seam: the existing repository day projection predates the required public
  // nakshatra/source fields. Keep this explicit, parameterized read at the API boundary until
  // the repository projection is extended by its owning data-access batch.
  const day = await db.prepare(
    `SELECT id,panjika_year_id,day_number,bengali_year,bengali_month,bengali_day,gregorian_date,weekday,paksha,tithi_id,tithi_start,tithi_end,nakshatra_id,nakshatra_start,nakshatra_end,sunrise,sunset,calendar_system,calculation_version,calculation_status,verification_status,source_ids_json,status
       FROM panjika_days
      WHERE panjika_year_id=? AND gregorian_date=? AND status='ACTIVE'
      LIMIT 1`,
  ).bind(CANONICAL.panjikaId, date).first<DayReadRow>();

  let tithi: TithiReadRow | null = null;
  if (day?.tithi_id) {
    tithi = await db.prepare(
      `SELECT id,code,name_bn,name_en,paksha,status,verification_status FROM tithis WHERE id=? LIMIT 1`,
    ).bind(day.tithi_id).first<TithiReadRow>();
  }
  return { year, day, tithi };
}

function serializeDay(day: DayReadRow, tithi: TithiReadRow | null, yearSourceIds: string) {
  if (day.bengali_year !== 1433 || day.calculation_version !== CANONICAL.panjikaCalculationVersion || day.calculation_status !== "CANONICAL_REGIONAL_CALCULATION" || day.calendar_system !== "Bisuddha Siddhanta" || day.verification_status === "REJECTED") throw new Error("PANJIKA_RECORD_INVALID");
  if (!day.tithi_id || !day.nakshatra_id || !day.source_ids_json) throw new Error("PANJIKA_RECORD_INCOMPLETE");
  if (!tithi || tithi.id !== day.tithi_id || tithi.status !== "ACTIVE" || tithi.verification_status === "REJECTED") throw new Error("TITHI_REFERENCE_INVALID");
  const sourceIds = parseSourceIds(day.source_ids_json);
  if (sourceIds.length === 0) throw new Error("PANJIKA_SOURCE_MISSING");
  return {
    id: day.id,
    panjikaYearId: CANONICAL.panjikaId,
    dayNumber: day.day_number,
    bengaliYear: day.bengali_year,
    bengaliMonth: day.bengali_month,
    bengaliDay: day.bengali_day,
    gregorianDate: day.gregorian_date,
    weekday: day.weekday,
    paksha: day.paksha,
    tithi: { id: tithi.id, code: tithi.code, nameBn: tithi.name_bn, nameEn: tithi.name_en, paksha: tithi.paksha, startsAt: day.tithi_start, endsAt: day.tithi_end },
    nakshatra: { id: day.nakshatra_id, startsAt: day.nakshatra_start, endsAt: day.nakshatra_end },
    sunrise: day.sunrise,
    sunset: day.sunset,
    calendarSystem: day.calendar_system,
    calculationVersion: day.calculation_version,
    calculationStatus: day.calculation_status,
    sourceIds,
    sourceId: sourceIds[0] ?? yearSourceIds,
    timezone: CANONICAL.timezone,
    verificationStatus: day.verification_status,
  };
}

export async function GET(request: Request): Promise<NextResponse> {
  const trace = traceId(request);
  const env = getCloudflareContext().env as unknown as CalendarRuntimeEnv;
  if (!env.DB) return errorResponse(503, trace, "DEPENDENCY_FAILURE", "পঞ্জিকা তথ্য সাময়িকভাবে পাওয়া যাচ্ছে না।");

  const requested = new URL(request.url).searchParams.get("date")?.trim() || todayInKolkata();
  if (!validIsoDate(requested)) return errorResponse(400, trace, "INVALID_DATE", "তারিখের বিন্যাস YYYY-MM-DD হতে হবে।");
  if (requested < PANJIKA_OPERATIONAL_START || requested > PANJIKA_OPERATIONAL_END) return errorResponse(404, trace, "DATE_OUT_OF_RANGE", "এই তারিখটি বর্তমান ১৪৩৩ পঞ্জিকা পরিসরের মধ্যে নেই।");

  try {
    const { year, day, tithi } = await loadReadModel(env.DB, requested);
    if (!day) return errorResponse(404, trace, "NOT_FOUND", "এই তারিখের পঞ্জিকা রেকর্ড পাওয়া যায়নি।");
    const data = serializeDay(day, tithi, "");
    return NextResponse.json({ ok: true, data, meta: { traceId: trace, source: "PANJIKA-Y1433", calculationVersion: year?.calculation_version } }, { status: 200, headers: JSON_HEADERS });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "PANJIKA_RECORD_INCOMPLETE" || code === "PANJIKA_SOURCE_MISSING" ? 503 : 502;
    return errorResponse(status, trace, status === 503 ? "DEPENDENCY_FAILURE" : "READ_MODEL_FAILURE", "পঞ্জিকা রেকর্ড যাচাই করা যায়নি।");
  }
}

import { CANONICAL } from "../config/canonical";

export interface ScheduleWindow {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
  source: string;
  sourceId?: string | null;
  labelBn?: string | null;
  labelEn?: string | null;
}

export interface ScheduleException {
  id: string;
  startAt: string;
  endAt: string;
  action: "CLOSE" | "OPEN";
  source: string;
  sourceId?: string | null;
  labelBn?: string | null;
  labelEn?: string | null;
}

export interface ScheduleOverride {
  id: string;
  startAt: string;
  endAt: string;
  mode: "SPECIAL_EVENT" | "OPEN_OVERRIDE" | "CLOSED_OVERRIDE";
  source: string;
  sourceId?: string | null;
  labelBn?: string | null;
  labelEn?: string | null;
}

export interface EffectiveScheduleInput {
  timezone: string;
  baseWindows: ScheduleWindow[];
  exceptions?: ScheduleException[];
  overrides?: ScheduleOverride[];
  now: string;
  lastUpdated?: string | null;
  staleAfter?: string | null;
}

export interface EffectiveSchedule {
  timezone: string;
  windows: ScheduleWindow[];
  nextOpening: string | null;
  provenance: string[];
  lastUpdated: string | null;
  staleAfter: string | null;
}

export class ScheduleDomainError extends Error {
  readonly code = "SCHEDULE_DOMAIN_ERROR";
  constructor(message: string) { super(message); this.name = "ScheduleDomainError"; }
}

function validInstant(value: string): number {
  const n = Date.parse(value);
  if (!Number.isFinite(n)) throw new ScheduleDomainError("Invalid instant");
  return n;
}

function overlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function subtractWindow(window: ScheduleWindow, exception: ScheduleException): ScheduleWindow[] {
  const ws = validInstant(window.startAt);
  const we = validInstant(window.endAt);
  const es = validInstant(exception.startAt);
  const ee = validInstant(exception.endAt);
  if (!overlap(ws, we, es, ee)) return [window];
  const result: ScheduleWindow[] = [];
  if (ws < es) result.push({ ...window, id: `${window.id}:before:${exception.id}`, endAt: exception.startAt });
  if (ee < we) result.push({ ...window, id: `${window.id}:after:${exception.id}`, startAt: exception.endAt });
  return result;
}

export function resolveEffectiveSchedule(input: EffectiveScheduleInput): EffectiveSchedule {
  if (input.timezone !== CANONICAL.timezone) throw new ScheduleDomainError("Unsupported timezone");
  const nowMs = validInstant(input.now);
  let windows = input.baseWindows.map((w) => ({ ...w }));
  for (const window of windows) {
    const start = validInstant(window.startAt);
    const end = validInstant(window.endAt);
    if (end <= start) throw new ScheduleDomainError("Invalid schedule window");
    if (window.timezone !== input.timezone) throw new ScheduleDomainError("Window timezone mismatch");
  }

  for (const exception of input.exceptions ?? []) {
    const start = validInstant(exception.startAt);
    const end = validInstant(exception.endAt);
    if (end <= start) throw new ScheduleDomainError("Invalid schedule exception");
    windows = exception.action === "CLOSE"
      ? windows.flatMap((window) => subtractWindow(window, exception))
      : windows.concat({
          id: exception.id, startAt: exception.startAt, endAt: exception.endAt, timezone: input.timezone,
          source: exception.source, sourceId: exception.sourceId ?? null, labelBn: exception.labelBn ?? null, labelEn: exception.labelEn ?? null,
        });
  }

  for (const override of input.overrides ?? []) {
    const start = validInstant(override.startAt);
    const end = validInstant(override.endAt);
    if (end <= start) throw new ScheduleDomainError("Invalid schedule override");
    if (override.mode === "CLOSED_OVERRIDE") {
      const close: ScheduleException = { id: override.id, startAt: override.startAt, endAt: override.endAt, action: "CLOSE", source: override.source, sourceId: override.sourceId, labelBn: override.labelBn, labelEn: override.labelEn };
      windows = windows.flatMap((window) => subtractWindow(window, close));
      continue;
    }
    windows.push({ id: override.id, startAt: override.startAt, endAt: override.endAt, timezone: input.timezone, source: override.source, sourceId: override.sourceId ?? null, labelBn: override.labelBn ?? null, labelEn: override.labelEn ?? null });
  }

  windows.sort((a, b) => validInstant(a.startAt) - validInstant(b.startAt) || a.id.localeCompare(b.id));
  const next = windows.find((window) => validInstant(window.startAt) > nowMs)?.startAt ?? null;
  const provenance = [...new Set(windows.map((window) => window.source).filter(Boolean))];
  return {
    timezone: input.timezone, windows, nextOpening: next,
    provenance, lastUpdated: input.lastUpdated ?? null, staleAfter: input.staleAfter ?? null,
  };
}

export const TEMPLE_OPERATING_MODEL = Object.freeze({
  operatingModel: CANONICAL.operatingModel,
  dailyFixedPuja: CANONICAL.dailyFixedPuja,
  devoteeInitiatedPuja: CANONICAL.devoteeInitiatedPuja,
  amavasyaPuja: CANONICAL.amavasyaPuja,
  specialPujaTiming: CANONICAL.specialPujaTiming,
});

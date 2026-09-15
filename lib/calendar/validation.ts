import {
  CANONICAL,
  PANJIKA_EXPECTED_RECORD_COUNT,
  PANJIKA_OPERATIONAL_END,
  PANJIKA_OPERATIONAL_START,
} from "../config/canonical";

export interface PanjikaIdentity {
  id: string;
  bengaliYear: number;
  calendarSystem: string;
  calculationVersion: string;
  timezone: string;
  operationalStart: string;
  operationalEnd: string;
  calculationStatus?: string;
}

export interface PanjikaRecord {
  id: string;
  gregorianDate: string;
  dayNumber: number;
  bengaliYear: number;
  tithiId?: string | null;
  paksha: string;
  calculationVersion: string;
  calculationStatus: string;
  sourceIds?: string[];
}

export class PanjikaValidationError extends Error {
  readonly code = "PANJIKA_VALIDATION_ERROR";

  constructor(message: string) {
    super(message);
    this.name = "PanjikaValidationError";
  }
}

function assertIsoDate(value: string, field: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new PanjikaValidationError(`${field} must be an ISO calendar date`);
  }
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new PanjikaValidationError(`${field} must be a valid calendar date`);
  }
}

export function validatePanjikaIdentity(year: PanjikaIdentity): void {
  assertIsoDate(year.operationalStart, "operationalStart");
  assertIsoDate(year.operationalEnd, "operationalEnd");

  if (year.operationalEnd < year.operationalStart) {
    throw new PanjikaValidationError("Panjika operational range is reversed");
  }
  if (year.id !== CANONICAL.panjikaId || year.bengaliYear !== 1433) {
    throw new PanjikaValidationError("Unexpected Panjika identity");
  }
  if (year.timezone !== CANONICAL.timezone) {
    throw new PanjikaValidationError("Panjika timezone mismatch");
  }
  if (year.calculationVersion !== CANONICAL.panjikaCalculationVersion) {
    throw new PanjikaValidationError("Panjika calculation version mismatch");
  }
  if (year.operationalStart !== PANJIKA_OPERATIONAL_START || year.operationalEnd !== PANJIKA_OPERATIONAL_END) {
    throw new PanjikaValidationError("Panjika operational range mismatch");
  }
}

export function validatePanjikaRecords(records: readonly PanjikaRecord[]): void {
  if (records.length !== PANJIKA_EXPECTED_RECORD_COUNT) {
    throw new PanjikaValidationError(`Expected ${PANJIKA_EXPECTED_RECORD_COUNT} records`);
  }

  const seenIds = new Set<string>();
  const seenDates = new Set<string>();
  const seenDayNumbers = new Set<number>();

  for (const record of records) {
    assertIsoDate(record.gregorianDate, `gregorianDate:${record.id}`);

    if (record.gregorianDate < PANJIKA_OPERATIONAL_START || record.gregorianDate > PANJIKA_OPERATIONAL_END) {
      throw new PanjikaValidationError(`Gregorian date outside operational range: ${record.id}`);
    }
    if (!Number.isInteger(record.dayNumber) || record.dayNumber < 1 || record.dayNumber > PANJIKA_EXPECTED_RECORD_COUNT) {
      throw new PanjikaValidationError(`Invalid day number: ${record.id}`);
    }
    if (seenIds.has(record.id)) {
      throw new PanjikaValidationError(`Duplicate record id: ${record.id}`);
    }
    if (seenDates.has(record.gregorianDate)) {
      throw new PanjikaValidationError(`Duplicate Gregorian date: ${record.gregorianDate}`);
    }
    if (seenDayNumbers.has(record.dayNumber)) {
      throw new PanjikaValidationError(`Duplicate day number: ${record.dayNumber}`);
    }

    seenIds.add(record.id);
    seenDates.add(record.gregorianDate);
    seenDayNumbers.add(record.dayNumber);

    if (record.calculationVersion !== CANONICAL.panjikaCalculationVersion) {
      throw new PanjikaValidationError(`Calculation version drift: ${record.id}`);
    }
    if (record.calculationStatus !== "CANONICAL_REGIONAL_CALCULATION") {
      throw new PanjikaValidationError(`Calculation status drift: ${record.id}`);
    }
    if (record.bengaliYear !== 1433) {
      throw new PanjikaValidationError(`Bengali year drift: ${record.id}`);
    }
  }

  for (let dayNumber = 1; dayNumber <= PANJIKA_EXPECTED_RECORD_COUNT; dayNumber += 1) {
    if (!seenDayNumbers.has(dayNumber)) {
      throw new PanjikaValidationError(`Missing day number: ${dayNumber}`);
    }
  }

  const dates = [...seenDates].sort();
  if (dates[0] !== PANJIKA_OPERATIONAL_START || dates[dates.length - 1] !== PANJIKA_OPERATIONAL_END) {
    throw new PanjikaValidationError("Panjika records do not cover the canonical operational boundaries");
  }
}

export const CANONICAL = Object.freeze({
  templeId: "TEMPLE-0001",
  deityId: "DEITY-0001",
  locationId: "LOCATION-0001",
  committeeId: "COMMITTEE-0001",
  currentCommitteeTermId: "TERM-0001",
  priestId: "PRIEST-000001",
  timezone: "Asia/Kolkata",
  panjikaId: "PANJIKA-Y1433",
  panjikaCalculationVersion: "CALC-BS1433-RAIGANJ-V1",
  operatingModel: "DAILY_MORNING_TO_NIGHT",
  dailyFixedPuja: "NONE",
  devoteeInitiatedPuja: "ALLOWED/ACTUAL",
  amavasyaPuja: "RECURRING_REQUIRED",
  specialPujaTiming: "EVENT_RUNTIME",
  donationConfigId: "DONATION-CONFIG-0001",
  storageProvider: "BACKBLAZE_B2",
  aiProductName: "Bhairava AI",
  aiProductNameBn: "ভৈরব AI",
} as const);

export const TEMPLE_STATUS_STALE_AFTER_SECONDS = 300;
export const PANJIKA_EXPECTED_RECORD_COUNT = 216;
export const PANJIKA_OPERATIONAL_START = "2026-09-11";
export const PANJIKA_OPERATIONAL_END = "2027-04-14";

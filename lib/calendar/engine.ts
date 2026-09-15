import { validatePanjikaIdentity, validatePanjikaRecords, type PanjikaIdentity, type PanjikaRecord } from "./validation";

export interface CanonicalCalendarDataset { year:PanjikaIdentity; records:PanjikaRecord[]; sourceIds:string[]; version:string; }
export function validateCanonicalCalendarDataset(dataset:CanonicalCalendarDataset):void{validatePanjikaIdentity(dataset.year);validatePanjikaRecords(dataset.records);}
export function getCalendarRecordForDate(dataset:CanonicalCalendarDataset,date:string):PanjikaRecord|null{validateCanonicalCalendarDataset(dataset);return dataset.records.find((r)=>r.gregorianDate===date)??null;}
export function getCalendarRecordForDayNumber(dataset:CanonicalCalendarDataset,dayNumber:number):PanjikaRecord|null{validateCanonicalCalendarDataset(dataset);return dataset.records.find((r)=>r.dayNumber===dayNumber)??null;}
export function projectPublicCalendarRecord(record:PanjikaRecord):Pick<PanjikaRecord,"id"|"gregorianDate"|"dayNumber"|"bengaliYear"|"tithiId"|"paksha"|"calculationVersion"|"calculationStatus">{return {id:record.id,gregorianDate:record.gregorianDate,dayNumber:record.dayNumber,bengaliYear:record.bengaliYear,tithiId:record.tithiId??null,paksha:record.paksha,calculationVersion:record.calculationVersion,calculationStatus:record.calculationStatus};}

export type ID = string;
export type ISOInstant = string;
export type Visibility = "PUBLIC" | "PRIVATE_ADMIN" | "NONE";
export type PublicationStatus = "UNPUBLISHED" | "PUBLISHED" | "ARCHIVED";
export type DomainResult<T> = { ok:true; value:T } | { ok:false; code:string; message:string; details?:Record<string, unknown> };

export interface Temple { id:ID; slug:string; nameBn:string; nameEn:string; status:"ACTIVE"|"INACTIVE"|"ARCHIVED"; sourceId:string|null; verificationStatus:string; revisionId:string|null; version:number; }
export interface TempleLocation { id:ID; templeId:ID; latitude:number; longitude:number; timezone:string; addressBn:string|null; addressEn:string|null; isPrimary:boolean; status:string; sourceId:string|null; verificationStatus:string; revisionId:string|null; }
export interface CalendarDay { id:ID; panjikaYearId:ID; dayNumber:number; bengaliYear:number; bengaliMonth:number; bengaliDay:number; gregorianDate:string; weekday:number; paksha:string; tithiId:string|null; tithiStart:ISOInstant; tithiEnd:ISOInstant; nakshatraStart:ISOInstant; nakshatraEnd:ISOInstant; sunrise:ISOInstant|null; sunset:ISOInstant|null; calendarSystem:string; calculationEngine:string; calculationMethod:string; calculationVersion:string; calculationStatus:string; verificationStatus:string; revisionId:string|null; version:number; status:string; }

export interface D1QueryResult<T> { results:T[]; success?:boolean; meta?:Record<string, unknown>; }

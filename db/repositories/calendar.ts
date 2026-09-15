import { findPanjikaYear, listPanjikaDays } from "../queries/calendar";
import type { D1Like } from "../../lib/db/client";
export { type PanjikaYearRow, type PanjikaDayRow } from "../queries/calendar";
export const calendarRepository={ getPanjikaYear:(db:D1Like,id:string)=>findPanjikaYear(db,id), listPanjikaDays:(db:D1Like,yearId:string,start:string,end:string)=>listPanjikaDays(db,yearId,start,end) };

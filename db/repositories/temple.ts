import { findPrimaryTempleLocation, findTemple, listPublishedObservances } from "../queries/temple";
import type { D1Like } from "../../lib/db/client";
export { type TempleRow, type TempleLocationRow, type TempleObservanceRow } from "../queries/temple";
export const templeRepository={
  getById:(db:D1Like,id:string)=>findTemple(db,id),
  getPrimaryLocation:(db:D1Like,templeId:string)=>findPrimaryTempleLocation(db,templeId),
  listPublishedObservances:(db:D1Like,templeId:string,startDate:string,endDate:string)=>listPublishedObservances(db,templeId,startDate,endDate),
};

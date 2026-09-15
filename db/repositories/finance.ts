import type { D1Like } from "../../lib/db/client";
import { findDonationPublic, listPublishedMonthlyReports } from "../queries/finance";
export const financeRepository={ findDonationPublic:(db:D1Like,reference:string)=>findDonationPublic(db,reference), listPublishedMonthlyReports:(db:D1Like,year:number)=>listPublishedMonthlyReports(db,year) };

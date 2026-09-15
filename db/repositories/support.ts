import type { D1Like } from "../../lib/db/client";
import { findPublicTicket, listPublicMessages } from "../queries/support";
export const supportRepository={ findPublicTicket:(db:D1Like,reference:string)=>findPublicTicket(db,reference), listPublicMessages:(db:D1Like,ticketId:string)=>listPublicMessages(db,ticketId) };

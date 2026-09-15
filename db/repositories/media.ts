import type { D1Like } from "../../lib/db/client";
import { listPublishedMedia } from "../queries/media";
export const mediaRepository={ listPublishedMedia:(db:D1Like,templeId:string,mediaType?:string)=>listPublishedMedia(db,templeId,mediaType) };

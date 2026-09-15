import type { D1Like } from "../../lib/db/client";

export interface JabaSubmissionRow {
  id:string; cycle_id:string|null; participant_id:string; mode:string; prayer_purpose:string|null;
  submission_reference:string; state:string; verification_status:string; verified_identity_key:string|null;
  donation_id:string|null; anonymous_public:number; submitted_at:string; verified_at:string|null; completed_at:string|null;
  rejected_at:string|null; cancelled_at:string|null; source_id:string|null; revision_id:string|null; version:number;
}

export async function getJabaSubmission(db:D1Like,id:string):Promise<JabaSubmissionRow|null>{
 return db.prepare(`SELECT id,cycle_id,participant_id,mode,prayer_purpose,submission_reference,state,verification_status,verified_identity_key,donation_id,anonymous_public,submitted_at,verified_at,completed_at,rejected_at,cancelled_at,source_id,revision_id,version FROM jaba_submissions WHERE id=? LIMIT 1`).bind(id).first<JabaSubmissionRow>();
}

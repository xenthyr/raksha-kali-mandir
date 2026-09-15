import type { D1Like } from "../../lib/db/client";
export async function getPublishedDocument(db:D1Like,id:string){return db.prepare(`SELECT id,slug,title_bn,title_en,document_type,status,published_at,source_id,revision_id,version FROM documents WHERE id=? AND status='PUBLISHED' LIMIT 1`).bind(id).first<Record<string,unknown>>();}

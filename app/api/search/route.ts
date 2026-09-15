import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { AuthDatabase } from "../../../lib/files/auth/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const HEADERS={"Cache-Control":"public, max-age=60, s-maxage=60","Content-Type":"application/json; charset=utf-8","X-Content-Type-Options":"nosniff","Referrer-Policy":"no-referrer"};
type Env={DB?:AuthDatabase};
type Row={id:string;entity_type:string;entity_id:string;locale:string;title:string;summary:string|null;canonical_path:string|null;updated_at:string;score:number};
const FORBIDDEN=new Set(["supportticket","supportmessage","supportattachment","supportassignment","supportinternalnote","emaildispatch","emailevent","donation","donationattempt","donationverification","user","userrole","permission","privatecontact","privatedocument"]);
function traceId(request:Request){const v=request.headers.get("x-request-id")?.trim();return v&&v.length<=128?v:crypto.randomUUID();}
function out(status:number,trace:string,data:unknown,error?:{code:string;message:string}){return NextResponse.json(error?{ok:false,error,meta:{traceId:trace}}:{ok:true,data,meta:{traceId:trace}},{status,headers:HEADERS});}
function text(v:string|null,max:number){const s=(v??"").trim();return s&&s.length<=max?s:null;}
export async function GET(request:Request):Promise<NextResponse>{
 const trace=traceId(request);const env=getCloudflareContext().env as unknown as Env;if(!env.DB)return out(503,trace,null,{code:"DEPENDENCY_FAILURE",message:"Search ব্যবস্থা এখন প্রস্তুত নয়।"});
 const url=new URL(request.url);const q=text(url.searchParams.get("q"),120);const locale=text(url.searchParams.get("locale"),8);const limitValue=Number(url.searchParams.get("limit")??"10");
 if(!q||q.length<2)return out(400,trace,null,{code:"INVALID_QUERY",message:"কমপক্ষে ২টি অক্ষরের search query দিন।"});
 const limit=Number.isInteger(limitValue)&&limitValue>=1&&limitValue<=25?limitValue:10; if(locale&&!["bn","en","bn-IN","en-IN"].includes(locale))return out(400,trace,null,{code:"INVALID_LOCALE",message:"ভাষার মান সঠিক নয়।"});
 try{
   const escaped=q.replace(/[\\%_]/g,"\\$&").toLowerCase();
   const like=`%${escaped}%`;const exact=q.toLowerCase();
   const rows=await env.DB.prepare(`
     SELECT id,entity_type,entity_id,locale,title,summary,canonical_path,updated_at,
       (CASE WHEN lower(title)=? THEN 1000 ELSE 0 END
        + CASE WHEN lower(title) LIKE ? ESCAPE '\\' THEN 500 ELSE 0 END
        + CASE WHEN lower(entity_id)=? THEN 450 ELSE 0 END
        + CASE WHEN lower(keywords) LIKE ? ESCAPE '\\' THEN 300 ELSE 0 END
        + CASE WHEN lower(body) LIKE ? ESCAPE '\\' THEN 200 ELSE 0 END
        + CASE WHEN locale=? THEN 100 ELSE 0 END
        + CASE WHEN updated_at >= datetime('now','-30 day') THEN 25 ELSE 0 END) AS score
     FROM search_documents
     WHERE audience_scope='PUBLIC' AND publication_status='PUBLISHED' AND verification_status='VERIFIED'
       AND lower(entity_type) NOT IN (${Array.from(FORBIDDEN,()=>"?").join(",")})
       AND (? IS NULL OR locale=?)
       AND (lower(title) LIKE ? ESCAPE '\\' OR lower(summary) LIKE ? ESCAPE '\\' OR lower(body) LIKE ? ESCAPE '\\' OR lower(keywords) LIKE ? ESCAPE '\\' OR lower(entity_id)=?)
     ORDER BY score DESC, CASE WHEN locale='bn-IN' THEN 0 WHEN locale='bn' THEN 1 ELSE 2 END, updated_at DESC, id ASC
     LIMIT ?`).bind(exact,like,exact,like,like,locale??"bn",...Array.from(FORBIDDEN),locale,locale,like,like,like,like,exact,limit).all<Row>();
   const data=rows.results.map((row)=>({id:row.id,entityType:row.entity_type,entityId:row.entity_id,locale:row.locale,title:row.title,summary:row.summary,canonicalPath:row.canonical_path,updatedAt:row.updated_at,score:row.score}));
   return out(200,trace,{query:q,locale:locale??null,count:data.length,results:data});
 }catch{return out(500,trace,null,{code:"INTERNAL_FAILURE",message:"Search ফলাফল এখন দেওয়া যাচ্ছে না।"});}
}

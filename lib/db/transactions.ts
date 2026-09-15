import type { D1Like, D1Statement } from "./client";

export async function executeBatch(db:D1Like, statements:D1Statement[]):Promise<void>{
  if (statements.length===0) return;
  await db.batch(statements);
}

export function requireStatementChange(result:{meta?:{changes?:number}}, expected=1):void{
  if ((result.meta?.changes??0)!==expected) throw new Error("DATABASE_CONFLICT");
}

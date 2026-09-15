export interface D1Statement { bind(...values: unknown[]): D1Statement; first<T=unknown>(): Promise<T|null>; all<T=unknown>(): Promise<{ results:T[] }>; run(): Promise<{ success:boolean; meta?:{ changes?:number; last_row_id?:number } }>; }
export interface D1Like { prepare(sql:string):D1Statement; batch<T=unknown>(statements:D1Statement[]):Promise<T>; }
export interface CloudflareRuntimeEnv { DB?: D1Like; }

export function requireDatabase(env: CloudflareRuntimeEnv): D1Like {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export function assertMutationChanged(result:{meta?:{changes?:number}}, expected=1): void {
  if ((result.meta?.changes ?? 0) !== expected) throw new Error("DATABASE_CONFLICT");
}

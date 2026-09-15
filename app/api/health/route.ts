import { NextResponse } from "next/server";

const HEALTH_RESPONSE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
  "Content-Type": "application/json; charset=utf-8",
};

export async function GET(request: Request) {
  const traceId = request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
  const now = new Date().toISOString();

  const data = {
    status: "ok" as const,
    time: now,
  };

  return NextResponse.json(
    {
      ok: true,
      data,
      meta: {
        traceId,
      },
    },
    {
      status: 200,
      headers: HEALTH_RESPONSE_HEADERS,
    },
  );
}

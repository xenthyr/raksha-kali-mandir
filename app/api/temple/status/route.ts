import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { templeRepository } from "../../../../db/repositories/temple";
import { CANONICAL } from "../../../../lib/config/canonical";
import type { D1Like } from "../../../../lib/db/client";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const REQUEST_ID_HEADER = "x-request-id";
const SERVER_FAILURE_MESSAGE = "মন্দিরের বর্তমান অবস্থা এখন নির্ভরযোগ্যভাবে পাওয়া যাচ্ছে না। পরে আবার চেষ্টা করুন।";
const DEPENDENCY_CODE = "DEPENDENCY_FAILURE";

interface RuntimeEnv {
  DB?: D1Like;
}

function runtimeEnv(): RuntimeEnv {
  return getCloudflareContext().env as unknown as RuntimeEnv;
}

function requestId(request: Request): string {
  const supplied = request.headers.get(REQUEST_ID_HEADER)?.trim();
  return supplied && supplied.length <= 128 ? supplied : crypto.randomUUID();
}

function jsonHeaders(): Record<string, string> {
  return {
    "Cache-Control": "no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  };
}

function errorResponse(
  status: number,
  traceId: string,
  code: string,
  message: string,
  reason?: string,
): NextResponse {
  return NextResponse.json(
    {
      ok: false,
      error: { code, message },
      meta: {
        traceId,
        templeId: CANONICAL.templeId,
        timezone: CANONICAL.timezone,
        ...(reason ? { reason } : {}),
      },
    },
    { status, headers: jsonHeaders() },
  );
}

/**
 * The status engine requires a concrete canonical schedule input. The current
 * schema exposes temple observances but does not yet expose a persisted,
 * versioned schedule read model carrying concrete open/close instants.
 *
 * Returning a dependency failure here is intentional: the route must never
 * invent permanent morning/night clock times or derive mutable operational
 * truth from request data. A later batch can connect the same route to the
 * canonical schedule producer without changing this public response shape.
 */
async function assertStatusPrerequisites(db: D1Like): Promise<void> {
  const temple = await templeRepository.getById(db, CANONICAL.templeId);
  const location = await templeRepository.getPrimaryLocation(db, CANONICAL.templeId);

  if (!temple || temple.status !== "ACTIVE") throw new Error("TEMPLE_UNAVAILABLE");
  if (!location || location.status !== "ACTIVE" || location.timezone !== CANONICAL.timezone) {
    throw new Error("TEMPLE_LOCATION_UNAVAILABLE");
  }

  throw new Error("STATUS_SCHEDULE_READ_MODEL_UNAVAILABLE");
}

export async function GET(request: Request): Promise<NextResponse> {
  const traceId = requestId(request);
  const env = runtimeEnv();
  const db = env.DB;

  if (!db) return errorResponse(503, traceId, DEPENDENCY_CODE, SERVER_FAILURE_MESSAGE, "DATABASE_UNAVAILABLE");

  try {
    await assertStatusPrerequisites(db);
    return errorResponse(503, traceId, DEPENDENCY_CODE, SERVER_FAILURE_MESSAGE, "STATUS_SCHEDULE_READ_MODEL_UNAVAILABLE");
  } catch (error) {
    if (error instanceof Error && error.message === "STATUS_SCHEDULE_READ_MODEL_UNAVAILABLE") {
      return errorResponse(503, traceId, DEPENDENCY_CODE, SERVER_FAILURE_MESSAGE, error.message);
    }
    if (error instanceof Error && (error.message === "TEMPLE_UNAVAILABLE" || error.message === "TEMPLE_LOCATION_UNAVAILABLE")) {
      return errorResponse(503, traceId, DEPENDENCY_CODE, SERVER_FAILURE_MESSAGE, error.message);
    }
    return errorResponse(500, traceId, "INTERNAL_FAILURE", SERVER_FAILURE_MESSAGE);
  }
}

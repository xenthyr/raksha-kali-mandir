import {
  BUSINESS_TIMEZONE,
  resolveRuntimeEnvironment,
  type WorkerBindings,
} from "./bindings";

/**
 * Midnight in Asia/Kolkata expressed as the UTC cron minute/hour used by the
 * locked runtime contract: 00:00 IST = 18:30 UTC on the preceding day.
 */
export const MIDNIGHT_IST_CRON = "30 18 * * *" as const;
export const SCHEDULED_DISPATCH_JOB_ID = "scheduled-dispatch" as const;

export type ScheduledJobStatus = "SUCCESS" | "FAILED";

export interface ScheduledInvocation {
  jobId: string;
  businessDate: string;
  timezone: typeof BUSINESS_TIMEZONE;
  startedAt: string;
  finishedAt: string;
  status: ScheduledJobStatus;
  cron: string;
  environment: "production" | "preview" | "unknown";
  error?: string;
}

export interface ScheduledControllerLike {
  cron: string;
  scheduledTime: number;
}

export interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

/**
 * Convert Cloudflare's scheduled UTC timestamp into the application's
 * Asia/Kolkata business date without manual offset arithmetic.
 */
export function businessDateFromScheduledTime(
  scheduledTime: number,
): string {
  if (!Number.isFinite(scheduledTime) || scheduledTime <= 0) {
    throw new RangeError(
      "scheduledTime must be a positive epoch-millisecond value",
    );
  }

  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date(scheduledTime));
}

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeCron(cron: string): string {
  const normalized = cron.trim();
  if (normalized === "") {
    throw new Error("scheduled controller cron expression is empty");
  }
  return normalized;
}

function logInvocation(invocation: ScheduledInvocation): void {
  const payload = {
    component: "scheduled-worker",
    event: "scheduled-invocation",
    ...invocation,
  };

  const serialized = JSON.stringify(payload);
  if (invocation.status === "FAILED") {
    console.error(serialized);
    return;
  }

  console.info(serialized);
}

/**
 * Deterministic scheduled dispatcher.
 *
 * Batch 005 does not own a mutable canonical scheduled job. The dispatcher
 * therefore performs a validated no-op and records an observable execution
 * result. Later batches may register domain jobs without changing the Worker
 * entrypoint or timezone contract.
 */
export async function dispatchScheduledJobs(
  controller: ScheduledControllerLike,
  env: WorkerBindings,
): Promise<ScheduledInvocation> {
  const startedAt = nowIso();
  const runtime = resolveRuntimeEnvironment(env);
  const cron = normalizeCron(controller.cron);
  const businessDate = businessDateFromScheduledTime(controller.scheduledTime);

  try {
    const invocation: ScheduledInvocation = {
      jobId: SCHEDULED_DISPATCH_JOB_ID,
      businessDate,
      timezone: BUSINESS_TIMEZONE,
      startedAt,
      finishedAt: nowIso(),
      status: "SUCCESS",
      cron,
      environment: runtime.environment,
    };

    logInvocation(invocation);
    return invocation;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown scheduled error";
    const invocation: ScheduledInvocation = {
      jobId: SCHEDULED_DISPATCH_JOB_ID,
      businessDate,
      timezone: BUSINESS_TIMEZONE,
      startedAt,
      finishedAt: nowIso(),
      status: "FAILED",
      cron,
      environment: runtime.environment,
      error: message,
    };

    logInvocation(invocation);
    throw error;
  }
}

export async function scheduledHandler(
  controller: ScheduledControllerLike,
  env: WorkerBindings,
  ctx: ExecutionContextLike,
): Promise<void> {
  // Keep the rejection visible to the platform after the failure has already
  // been logged by dispatchScheduledJobs. This avoids silently converting a
  // failed scheduled execution into an apparently successful invocation.
  ctx.waitUntil(dispatchScheduledJobs(controller, env));
}

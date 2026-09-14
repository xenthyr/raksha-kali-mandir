import {
  BUSINESS_TIMEZONE,
  type DeploymentEnvironment,
  resolveRuntimeEnvironment,
  type WorkerBindings,
} from "./bindings";

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
 * Convert a Cloudflare scheduled UTC timestamp into the application's business
 * date. Using Intl rather than manual offsets keeps the calculation explicit and
 * resilient to calendar boundaries while preserving Asia/Kolkata semantics.
 */
export function businessDateFromScheduledTime(
  scheduledTime: number,
): string {
  if (!Number.isFinite(scheduledTime) || scheduledTime <= 0) {
    throw new RangeError("scheduledTime must be a positive epoch-millisecond value");
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

function logInvocation(invocation: ScheduledInvocation): void {
  const payload = {
    component: "scheduled-worker",
    ...invocation,
  };

  if (invocation.status === "FAILED") {
    console.error(JSON.stringify(payload));
    return;
  }

  console.info(JSON.stringify(payload));
}

/**
 * Current release has no canonical scheduled mutation registered yet. The
 * dispatcher therefore provides a real, deterministic, observable empty-state
 * execution rather than inventing a future domain job or mutating canonical
 * data prematurely. Later job producers can be attached to this dispatcher
 * without changing the Worker entrypoint contract.
 */
export async function dispatchScheduledJobs(
  controller: ScheduledControllerLike,
  env: WorkerBindings,
): Promise<ScheduledInvocation> {
  const startedAt = nowIso();
  const runtime = resolveRuntimeEnvironment(env);
  const businessDate = businessDateFromScheduledTime(controller.scheduledTime);

  try {
    if (controller.cron.trim() === "") {
      throw new Error("scheduled controller cron expression is empty");
    }

    const invocation: ScheduledInvocation = {
      jobId: SCHEDULED_DISPATCH_JOB_ID,
      businessDate,
      timezone: BUSINESS_TIMEZONE,
      startedAt,
      finishedAt: nowIso(),
      status: "SUCCESS",
    };

    console.info(
      JSON.stringify({
        component: "scheduled-worker",
        event: "empty-dispatch-state",
        cron: controller.cron,
        jobId: SCHEDULED_DISPATCH_JOB_ID,
        businessDate,
        timezone: BUSINESS_TIMEZONE,
        environment: runtime.environment,
      }),
    );
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
  // Scheduled work is detached from the request lifecycle through waitUntil;
  // Cloudflare may safely retry the invocation without a canonical mutation in
  // this release's empty scheduled-job state.
  ctx.waitUntil(
    dispatchScheduledJobs(controller, env).catch((error) => {
      const environment: DeploymentEnvironment | "unknown" =
        resolveRuntimeEnvironment(env).environment;
      console.error(
        JSON.stringify({
          component: "scheduled-worker",
          jobId: SCHEDULED_DISPATCH_JOB_ID,
          timezone: BUSINESS_TIMEZONE,
          environment,
          status: "FAILED",
          error: error instanceof Error ? error.message : "Unknown scheduled error",
        }),
      );
    }),
  );
}

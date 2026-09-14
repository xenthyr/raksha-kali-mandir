/**
 * Worker runtime binding interfaces.
 *
 * Resource selection is owned by Wrangler environment configuration. This
 * module describes the runtime seam without embedding production/preview
 * resource identifiers or secret values in application code.
 */

export const BUSINESS_TIMEZONE = "Asia/Kolkata" as const;
export const PRODUCTION_ENVIRONMENT = "production" as const;
export const PREVIEW_ENVIRONMENT = "preview" as const;

export type DeploymentEnvironment =
  | typeof PRODUCTION_ENVIRONMENT
  | typeof PREVIEW_ENVIRONMENT;

export interface D1DatabaseBinding {
  prepare(query: string): unknown;
}

export interface KVNamespaceBinding {
  get(key: string, options?: unknown): Promise<string | null>;
  put(key: string, value: string, options?: unknown): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface FetcherBinding {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

/**
 * Runtime values exposed by the Worker.
 *
 * Secret values are typed here only so downstream server-side code can consume
 * them. They must be supplied by the platform and never committed to source.
 */
export interface WorkerBindings {
  ASSETS: FetcherBinding;
  DB: D1DatabaseBinding;
  CACHE: KVNamespaceBinding;
  SESSION_STORE: KVNamespaceBinding;

  /** Explicit environment marker when one is supplied by deployment config. */
  ENVIRONMENT?: DeploymentEnvironment;

  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_SITE_NAME?: string;
  NEXT_PUBLIC_DEFAULT_LOCALE?: string;
  NEXT_PUBLIC_GOOGLE_MAPS_URL?: string;
  NEXT_PUBLIC_WHATSAPP_GROUP_URL?: string;

  DATABASE_ID?: string;
  B2_BUCKET_NAME?: string;
  B2_REGION?: string;
  B2_S3_ENDPOINT?: string;
  B2_ACCESS_KEY_ID?: string;
  B2_SECRET_ACCESS_KEY?: string;
  AUTH_SECRET?: string;
  SESSION_COOKIE_NAME?: string;
  TURNSTILE_SECRET_KEY?: string;
  UPI_VPA?: string;
  UPI_PAYEE_NAME?: string;
  UPI_TRANSACTION_NOTE?: string;
  NOTIFICATION_VAPID_PUBLIC_KEY?: string;
  NOTIFICATION_VAPID_PRIVATE_KEY?: string;
  AI_PROVIDER_API_KEY?: string;
  AI_MODEL?: string;
  ERROR_REPORTING_DSN?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_REPLY_TO?: string;
  SUPPORT_PRIMARY_EMAIL?: string;
  SUPPORT_BACKUP_EMAIL?: string;
}

export interface RuntimeEnvironmentResult {
  environment: DeploymentEnvironment | "unknown";
  isProduction: boolean;
  isPreview: boolean;
}

/**
 * Resolve the deployment environment without guessing when the runtime marker
 * is missing or invalid. Unknown is fail-safe for environment-sensitive work.
 */
export function resolveRuntimeEnvironment(
  env: Pick<WorkerBindings, "ENVIRONMENT">,
): RuntimeEnvironmentResult {
  const value = env.ENVIRONMENT;

  if (value === PRODUCTION_ENVIRONMENT) {
    return {
      environment: PRODUCTION_ENVIRONMENT,
      isProduction: true,
      isPreview: false,
    };
  }

  if (value === PREVIEW_ENVIRONMENT) {
    return {
      environment: PREVIEW_ENVIRONMENT,
      isProduction: false,
      isPreview: true,
    };
  }

  return { environment: "unknown", isProduction: false, isPreview: false };
}

/**
 * Fail closed for work that explicitly requires a known deployment target.
 */
export function requireKnownRuntimeEnvironment(
  env: Pick<WorkerBindings, "ENVIRONMENT">,
): RuntimeEnvironmentResult {
  const runtime = resolveRuntimeEnvironment(env);

  if (runtime.environment === "unknown") {
    throw new Error("Worker deployment environment is not explicitly configured");
  }

  return runtime;
}

/**
 * Return a compact, non-secret environment description suitable for logs.
 */
export function describeRuntimeEnvironment(
  env: Pick<WorkerBindings, "ENVIRONMENT">,
): RuntimeEnvironmentResult {
  return resolveRuntimeEnvironment(env);
}

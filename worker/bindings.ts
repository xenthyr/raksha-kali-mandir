/**
 * Cloudflare Worker binding contract.
 *
 * This module intentionally describes bindings rather than configuring resource
 * identifiers. Resource selection belongs to Wrangler environment configuration.
 * Keeping identifiers out of application code prevents preview from accidentally
 * addressing production resources and keeps secrets outside the client bundle.
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
 * Environment values exposed to Worker code.
 *
 * Secrets are represented only by their variable names here. Their values are
 * supplied by Cloudflare runtime configuration and are never committed.
 */
export interface WorkerBindings {
  ASSETS: FetcherBinding;
  DB: D1DatabaseBinding;
  CACHE: KVNamespaceBinding;
  SESSION_STORE: KVNamespaceBinding;

  /** Explicit Wrangler environment marker: production | preview. */
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

  [key: string]: unknown;
}

export interface RuntimeEnvironmentResult {
  environment: DeploymentEnvironment | "unknown";
  isProduction: boolean;
  isPreview: boolean;
}

/**
 * Resolve the deployment environment without guessing production when the
 * marker is absent. Unknown is intentionally fail-safe for environment-
 * sensitive jobs.
 */
export function resolveRuntimeEnvironment(
  env: Pick<WorkerBindings, "ENVIRONMENT">,
): RuntimeEnvironmentResult {
  const value = env.ENVIRONMENT;

  if (value === PRODUCTION_ENVIRONMENT) {
    return { environment: value, isProduction: true, isPreview: false };
  }

  if (value === PREVIEW_ENVIRONMENT) {
    return { environment: value, isProduction: false, isPreview: true };
  }

  return { environment: "unknown", isProduction: false, isPreview: false };
}

/**
 * Return a compact, non-secret environment description suitable for logs.
 */
export function describeRuntimeEnvironment(
  env: Pick<WorkerBindings, "ENVIRONMENT">,
): RuntimeEnvironmentResult {
  return resolveRuntimeEnvironment(env);
}

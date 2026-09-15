export type RuntimeEnvironment = Record<string, string | undefined>;

export interface AppEnvironment {
  siteUrl: string;
  databaseId: string;
  sessionCookieName: string;
  emailFrom: string | null;
  emailReplyTo: string | null;
  resendApiKey: string | null;
  b2BucketName: string;
  b2Region: string;
  b2Endpoint: string;
}

export class EnvironmentConfigurationError extends Error {
  readonly code = "INVALID_ENVIRONMENT_CONFIGURATION";
  constructor(message: string) { super(message); this.name = "EnvironmentConfigurationError"; }
}

function required(env: RuntimeEnvironment, key: string): string {
  const value = env[key]?.trim();
  if (!value) throw new EnvironmentConfigurationError(`Missing required environment variable: ${key}`);
  return value;
}

function optional(env: RuntimeEnvironment, key: string): string | null {
  const value = env[key]?.trim();
  return value || null;
}

function httpsUrl(value: string, key: string): string {
  let url: URL;
  try { url = new URL(value); } catch { throw new EnvironmentConfigurationError(`${key} must be a valid URL`); }
  if (url.protocol !== "https:" || url.hostname === "localhost") throw new EnvironmentConfigurationError(`${key} must be an HTTPS non-local URL`);
  return url.toString().replace(/\/$/, "");
}

export function loadEnvironment(env: RuntimeEnvironment): AppEnvironment {
  const siteUrl = httpsUrl(required(env, "NEXT_PUBLIC_SITE_URL"), "NEXT_PUBLIC_SITE_URL");
  const b2Endpoint = httpsUrl(required(env, "B2_ENDPOINT"), "B2_ENDPOINT");
  const b2BucketName = required(env, "B2_BUCKET_NAME");
  const b2Region = required(env, "B2_REGION");
  if (b2BucketName !== "raksha-kali-mandir-storage" || b2Region !== "eu-central-003") {
    throw new EnvironmentConfigurationError("Backblaze B2 configuration does not match the production storage contract");
  }
  return {
    siteUrl,
    databaseId: required(env, "DATABASE_ID"),
    sessionCookieName: optional(env, "SESSION_COOKIE_NAME") || "raksha_kali_session",
    emailFrom: optional(env, "EMAIL_FROM"),
    emailReplyTo: optional(env, "EMAIL_REPLY_TO"),
    resendApiKey: optional(env, "RESEND_API_KEY"),
    b2BucketName, b2Region, b2Endpoint,
  };
}

import { hashOpaqueToken } from "./crypto";
import type { AuthDatabase } from "./types";

export type AuthRateLimitOperation = "LOGIN" | "PASSWORD_RESET_REQUEST" | "PASSWORD_RESET_CONFIRM";

const POLICIES: Record<AuthRateLimitOperation, { windowSeconds: number; maxAttempts: number; blockSeconds: number }> = {
  LOGIN: { windowSeconds: 15 * 60, maxAttempts: 10, blockSeconds: 15 * 60 },
  PASSWORD_RESET_REQUEST: { windowSeconds: 15 * 60, maxAttempts: 5, blockSeconds: 15 * 60 },
  PASSWORD_RESET_CONFIRM: { windowSeconds: 15 * 60, maxAttempts: 8, blockSeconds: 30 * 60 },
};

export async function consumeRateLimit(
  db: AuthDatabase,
  operation: AuthRateLimitOperation,
  rawKey: string,
  now = new Date(),
): Promise<{ allowed: boolean; retryAfterSeconds: number }> {
  const policy = POLICIES[operation];
  const bucketKeyHash = await hashOpaqueToken(`${operation}:${rawKey}`);
  const windowStartMs = Math.floor(now.getTime() / (policy.windowSeconds * 1000)) * policy.windowSeconds * 1000;
  const windowStartedAt = new Date(windowStartMs).toISOString();
  const windowExpiresAt = new Date(windowStartMs + policy.windowSeconds * 1000).toISOString();
  const blockedUntil = new Date(now.getTime() + policy.blockSeconds * 1000).toISOString();

  await db
    .prepare(`DELETE FROM auth_rate_limits WHERE window_expires_at <= CURRENT_TIMESTAMP`)
    .run();

  await db
    .prepare(
      `INSERT INTO auth_rate_limits
       (id, bucket_key_hash, operation, window_started_at, window_expires_at, attempt_count, blocked_until)
       VALUES (?, ?, ?, ?, ?, 1, NULL)
       ON CONFLICT(bucket_key_hash, operation, window_started_at) DO UPDATE SET
         attempt_count = attempt_count + 1,
         blocked_until = CASE
           WHEN auth_rate_limits.attempt_count + 1 > ? THEN ?
           ELSE auth_rate_limits.blocked_until
         END,
         updated_at = CURRENT_TIMESTAMP`,
    )
    .bind(crypto.randomUUID(), bucketKeyHash, operation, windowStartedAt, windowExpiresAt, policy.maxAttempts, blockedUntil)
    .run();

  const current = await db
    .prepare(
      `SELECT attempt_count, blocked_until
       FROM auth_rate_limits
       WHERE bucket_key_hash = ? AND operation = ? AND window_started_at = ? LIMIT 1`,
    )
    .bind(bucketKeyHash, operation, windowStartedAt)
    .first<{ attempt_count: number; blocked_until: string | null }>();

  if (!current) return { allowed: false, retryAfterSeconds: policy.blockSeconds };
  if (current.attempt_count > policy.maxAttempts || current.blocked_until) {
    const until = current.blocked_until ? new Date(current.blocked_until).getTime() : now.getTime() + policy.blockSeconds * 1000;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((until - now.getTime()) / 1000)) };
  }
  return { allowed: true, retryAfterSeconds: 0 };
}

export const AUTH_RATE_LIMIT_POLICIES = POLICIES;

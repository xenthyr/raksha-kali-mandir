import type { AuthDatabase } from "./types";

export type AuthAuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_RATE_LIMITED"
  | "LOGOUT"
  | "SESSION_REVOKED"
  | "PASSWORD_INITIALIZED"
  | "PASSWORD_CHANGED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_SUCCEEDED"
  | "PASSWORD_RESET_FAILED"
  | "PASSWORD_RESET_RATE_LIMITED"
  | "ACCOUNT_PROVISIONED"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_UNLOCKED";

export async function writeAuthAuditEvent(
  db: AuthDatabase,
  input: {
    actorUserId?: string | null;
    subjectUserId?: string | null;
    action: AuthAuditAction;
    result: "SUCCESS" | "DENIED" | "CONFLICT" | "INVALID" | "NOT_FOUND" | "FAILURE";
    requestId?: string | null;
    reasonCode?: string | null;
    metadata?: Record<string, unknown>;
  },
): Promise<void> {
  const metadata = JSON.stringify(input.metadata ?? {});
  await db
    .prepare(
      `INSERT INTO auth_audit_events
       (id, actor_user_id, subject_user_id, action, result, request_id, reason_code, metadata_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.actorUserId ?? null,
      input.subjectUserId ?? null,
      input.action,
      input.result,
      input.requestId ?? null,
      input.reasonCode ?? null,
      metadata,
    )
    .run();
}

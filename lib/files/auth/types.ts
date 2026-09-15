export interface AuthDatabaseStatement {
  bind(...values: unknown[]): AuthDatabaseStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta?: { changes?: number } }>;
}

export interface AuthDatabase {
  prepare(sql: string): AuthDatabaseStatement;
  batch<T = unknown>(statements: AuthDatabaseStatement[]): Promise<T>;
}

export interface AuthSessionStore {
  get<T = string>(key: string, type?: "text" | "json"): Promise<T | null>;
  put(key: string, value: string, options?: { expiration?: number; expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export type AuthResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: AuthErrorCode; message: string };

export type AuthErrorCode =
  | "INVALID_INPUT"
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "ACCOUNT_LOCKED"
  | "FIRST_LOGIN_SETUP_REQUIRED"
  | "SESSION_INVALID"
  | "RESET_UNAVAILABLE"
  | "RESET_INVALID"
  | "RESET_EXPIRED"
  | "RATE_LIMITED"
  | "CONFLICT"
  | "DEPENDENCY_FAILURE"
  | "INTERNAL_FAILURE";

export interface AuthUserRecord {
  id: string;
  personId: string | null;
  username: string | null;
  phoneNormalized: string | null;
  passwordHash: string | null;
  passwordKdfVersion: string | null;
  mustChangePassword: boolean;
  status: "ACTIVE" | "LOCKED" | "DISABLED" | "INVITED" | "ARCHIVED";
  failedLoginCount: number;
  lockedUntil: string | null;
}

export interface AuthRoleRecord {
  code: string;
  validFrom: string;
  validTo: string | null;
  status: "ACTIVE" | "REVOKED" | "EXPIRED";
}

export interface AuthPermissionRecord {
  code: string;
  resource: string;
  action: string;
}

export interface AuthenticatedPrincipal {
  userId: string;
  personId: string | null;
  username: string;
  roles: string[];
  permissions: string[];
}

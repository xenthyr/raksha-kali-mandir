import { z } from "zod";

export const loginInputSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
  password: z.string().min(1).max(128),
});

export const resetRequestInputSchema = z.object({
  identifier: z.string().trim().min(1).max(254),
});

export const resetConfirmInputSchema = z.object({
  token: z.string().trim().min(32).max(256),
  newPassword: z.string().min(12).max(128),
});

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  const compact = trimmed.replace(/[\s().-]/g, "");
  if (compact.startsWith("+")) {
    return `+${compact.slice(1).replace(/\D/g, "")}`;
  }
  return compact.replace(/\D/g, "");
}

export function isPhoneIdentifier(value: string): boolean {
  const normalized = normalizePhone(value);
  return /^\+?[0-9]{10,15}$/.test(normalized);
}

export function normalizeLoginIdentifier(value: string):
  | { kind: "phone"; value: string }
  | { kind: "username"; value: string } {
  return isPhoneIdentifier(value)
    ? { kind: "phone", value: normalizePhone(value) }
    : { kind: "username", value: normalizeUsername(value) };
}

import { describe, expect, it } from "vitest";
import {
  PASSWORD_KDF_VERSION,
  RESET_TOKEN_BYTE_LENGTH,
  SESSION_TOKEN_BYTE_LENGTH,
  assertPasswordPolicy,
  generateInitialPassword,
  generateOpaqueToken,
  hashPassword,
  tokenByteLength,
  verifyPassword,
} from "../crypto";

describe("auth crypto foundation", () => {
  it("uses one explicit versioned password KDF", () => {
    expect(PASSWORD_KDF_VERSION).toBe("PBKDF2-SHA256-V1-600K");
  });

  it("hashes and verifies passwords without equality shortcutting", async () => {
    const hash = await hashPassword("Secure!Pass1234");
    expect(hash.startsWith(`${PASSWORD_KDF_VERSION}$`)).toBe(true);
    await expect(verifyPassword("Secure!Pass1234", hash)).resolves.toBe(true);
    await expect(verifyPassword("Wrong!Pass1234", hash)).resolves.toBe(false);
  });

  it("generates correctly sized opaque reset/session tokens", () => {
    const reset = generateOpaqueToken(RESET_TOKEN_BYTE_LENGTH);
    const session = generateOpaqueToken(SESSION_TOKEN_BYTE_LENGTH);
    expect(tokenByteLength(reset)).toBe(RESET_TOKEN_BYTE_LENGTH);
    expect(tokenByteLength(session)).toBe(SESSION_TOKEN_BYTE_LENGTH);
  });

  it("generates policy-compatible initial passwords", () => {
    const password = generateInitialPassword();
    expect(password.length).toBeGreaterThanOrEqual(12);
    expect(() => assertPasswordPolicy(password)).not.toThrow();
  });
});

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export const PASSWORD_KDF_VERSION = "PBKDF2-SHA256-V1-600K" as const;
const PASSWORD_KDF_ITERATIONS = 600_000;
const PASSWORD_KEY_LENGTH = 256;
const PASSWORD_SALT_BYTES = 16;
const SESSION_TOKEN_BYTES = 32;
const RESET_TOKEN_BYTES = 32;
const INITIAL_PASSWORD_BYTES = 24;
const PASSWORD_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PASSWORD_LOWER = "abcdefghijkmnopqrstuvwxyz";
const PASSWORD_DIGIT = "23456789";
const PASSWORD_SYMBOL = "!@#$%^&*-_=+";
const PASSWORD_ALPHABET = `${PASSWORD_UPPER}${PASSWORD_LOWER}${PASSWORD_DIGIT}${PASSWORD_SYMBOL}`;

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function digestSha256(value: Uint8Array): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return new Uint8Array(digest);
}

export async function hashOpaqueToken(token: string): Promise<string> {
  return bytesToBase64Url(await digestSha256(TEXT_ENCODER.encode(token)));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    PASSWORD_KEY_LENGTH,
  );
  return `${PASSWORD_KDF_VERSION}$${bytesToBase64Url(salt)}$${bytesToBase64Url(new Uint8Array(bits))}`;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  const [version, saltEncoded, expectedEncoded] = encoded.split("$");
  if (version !== PASSWORD_KDF_VERSION || !saltEncoded || !expectedEncoded) return false;
  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = base64UrlToBytes(saltEncoded);
    expected = base64UrlToBytes(expectedEncoded);
  } catch {
    return false;
  }
  if (salt.length !== PASSWORD_SALT_BYTES || expected.length !== PASSWORD_KEY_LENGTH / 8) return false;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PASSWORD_KDF_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    PASSWORD_KEY_LENGTH,
  );
  return constantTimeEqual(new Uint8Array(bits), expected);
}

export function generateOpaqueToken(byteLength = SESSION_TOKEN_BYTES): string {
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

function randomCharacter(alphabet: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(1));
  return alphabet[bytes[0] % alphabet.length];
}

export function generateInitialPassword(): string {
  const required = [
    randomCharacter(PASSWORD_UPPER),
    randomCharacter(PASSWORD_LOWER),
    randomCharacter(PASSWORD_DIGIT),
    randomCharacter(PASSWORD_SYMBOL),
  ];
  const bytes = crypto.getRandomValues(new Uint8Array(INITIAL_PASSWORD_BYTES - required.length));
  for (const byte of bytes) required.push(PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]);
  const shuffleBytes = crypto.getRandomValues(new Uint8Array(required.length));
  for (let i = required.length - 1; i > 0; i -= 1) {
    const j = shuffleBytes[i] % (i + 1);
    [required[i], required[j]] = [required[j], required[i]];
  }
  return required.join("");
}

export function assertPasswordPolicy(password: string): void {
  if (password.length < 12 || password.length > 128) throw new Error("password_policy_violation");
  if (/\s/.test(password)) throw new Error("password_policy_violation");
  if (![...password].some((c) => /[A-Z]/.test(c))) throw new Error("password_policy_violation");
  if (![...password].some((c) => /[a-z]/.test(c))) throw new Error("password_policy_violation");
  if (![...password].some((c) => /[0-9]/.test(c))) throw new Error("password_policy_violation");
  if (![...password].some((c) => /[^A-Za-z0-9]/.test(c))) throw new Error("password_policy_violation");
}

export function decodeToken(token: string): Uint8Array {
  return base64UrlToBytes(token);
}

export function tokenByteLength(token: string): number {
  return decodeToken(token).byteLength;
}

export const RESET_TOKEN_BYTE_LENGTH = RESET_TOKEN_BYTES;
export const SESSION_TOKEN_BYTE_LENGTH = SESSION_TOKEN_BYTES;
export const PASSWORD_KDF_ITERATION_COUNT = PASSWORD_KDF_ITERATIONS;

export const authCryptoTestVectors = {
  version: PASSWORD_KDF_VERSION,
  passwordMinimumLength: 12,
  passwordMaximumLength: 128,
  sessionTokenBytes: SESSION_TOKEN_BYTES,
  resetTokenBytes: RESET_TOKEN_BYTES,
};

export function utf8(value: string): Uint8Array {
  return TEXT_ENCODER.encode(value);
}

export function utf8Decode(value: Uint8Array): string {
  return TEXT_DECODER.decode(value);
}

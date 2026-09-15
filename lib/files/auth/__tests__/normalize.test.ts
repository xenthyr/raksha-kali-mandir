import { describe, expect, it } from "vitest";
import { normalizeLoginIdentifier, normalizePhone, normalizeUsername } from "../normalize";

describe("auth identifier normalization", () => {
  it("normalizes usernames deterministically", () => {
    expect(normalizeUsername("  Mithun.Sarkar ")).toBe("mithun.sarkar");
  });

  it("normalizes international phone formatting", () => {
    expect(normalizePhone("+91 (98765) 43210")).toBe("+919876543210");
  });

  it("classifies phone versus username login identifiers", () => {
    expect(normalizeLoginIdentifier("+919876543210")).toEqual({ kind: "phone", value: "+919876543210" });
    expect(normalizeLoginIdentifier("Mithun.Sarkar")).toEqual({ kind: "username", value: "mithun.sarkar" });
  });
});

import { describe, expect, it } from "vitest";

import { __normaliseFragmentForTests as normalise, signatureKey } from "@/lib/authorNormalize";

describe("normaliseFragment", () => {
  it.each([
    ["Sasha Müller", "sashamueller"],
    ["Sasha Mueller", "sashamueller"],
    ["sasha.mueller", "sashamueller"],
    ["SASHA_MÜLLER", "sashamueller"],
    ["  Sasha   Müller  ", "sashamueller"],
  ])("normalises %s -> %s", (input, expected) => {
    expect(normalise(input)).toBe(expected);
  });

  it("collapses German digraph variants", () => {
    expect(normalise("Müller")).toBe(normalise("Mueller"));
    expect(normalise("Größer")).toBe(normalise("Groesser"));
  });

  it("collapses Nordic and French diacritics", () => {
    expect(normalise("Åström")).toBe(normalise("Aastroem"));
    expect(normalise("Cœur")).toBe(normalise("Coeur"));
  });

  it("returns empty string for blank input", () => {
    expect(normalise("")).toBe("");
    expect(normalise("   ")).toBe("");
  });
});

describe("signatureKey", () => {
  it("encodes name | email-local with normalised fragments", () => {
    expect(signatureKey("Sasha Müller", "sasha@example.com")).toBe("sashamueller|sasha");
  });

  it("produces different keys when only the email-local differs", () => {
    // This is the exact case that the leaderboard's union-find now bridges:
    // two signatures with the same normalised name but different email locals
    // still collide here at the key level — the merge happens downstream.
    expect(signatureKey("Sasha Müller", "sasha@example.com")).not.toBe(
      signatureKey("sasha.mueller", "sasha.mueller@example.com"),
    );
  });

  it("tolerates missing name or email", () => {
    expect(signatureKey(null, "sasha@example.com")).toBe("|sasha");
    expect(signatureKey("Sasha Müller", null)).toBe("sashamueller|");
    expect(signatureKey(null, null)).toBe("|");
  });
});

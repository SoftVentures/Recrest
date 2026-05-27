import { describe, expect, it } from "vitest";

import { __normaliseFragmentForTests as normalise, signatureKey } from "@/lib/authorNormalize";

describe("normaliseFragment", () => {
  it.each([
    ["Valentin Röhle", "valentinroehle"],
    ["Valentin Roehle", "valentinroehle"],
    ["valentin.roehle", "valentinroehle"],
    ["VALENTIN_RÖHLE", "valentinroehle"],
    ["  Valentin   Röhle  ", "valentinroehle"],
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
    expect(signatureKey("Valentin Röhle", "valentin@example.com")).toBe("valentinroehle|valentin");
  });

  it("produces different keys when only the email-local differs", () => {
    // This is the exact case that the leaderboard's union-find now bridges:
    // two signatures with the same normalised name but different email locals
    // still collide here at the key level — the merge happens downstream.
    expect(signatureKey("Valentin Röhle", "valentin@example.com")).not.toBe(
      signatureKey("valentin.roehle", "valentin.roehle@example.com"),
    );
  });

  it("tolerates missing name or email", () => {
    expect(signatureKey(null, "valentin@example.com")).toBe("|valentin");
    expect(signatureKey("Valentin Röhle", null)).toBe("valentinroehle|");
    expect(signatureKey(null, null)).toBe("|");
  });
});

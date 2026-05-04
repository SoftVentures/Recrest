import { describe, expect, it } from "vitest";

import { __normaliseFragmentForTests, signatureKey } from "@/lib/authorNormalize";

describe("normaliseFragment", () => {
  it("collapses German umlauts to their digraph form", () => {
    expect(__normaliseFragmentForTests("Müller")).toBe("mueller");
    expect(__normaliseFragmentForTests("Käse")).toBe("kaese");
    expect(__normaliseFragmentForTests("Straße")).toBe("strasse");
    expect(__normaliseFragmentForTests("Öztürk")).toBe("oeztuerk");
  });

  it("treats umlaut and ASCII variants as equivalent", () => {
    expect(__normaliseFragmentForTests("Müller")).toBe(__normaliseFragmentForTests("Mueller"));
  });

  it("strips general diacritics via NFD", () => {
    expect(__normaliseFragmentForTests("François")).toBe("francois");
    expect(__normaliseFragmentForTests("José")).toBe("jose");
    expect(__normaliseFragmentForTests("Ærø")).toBe("aeroe");
  });

  it("handles Polish, Turkish, Nordic letters", () => {
    expect(__normaliseFragmentForTests("Łukasz")).toBe("lukasz");
    expect(__normaliseFragmentForTests("İlhan")).toBe("ilhan");
    expect(__normaliseFragmentForTests("Søren")).toBe("soeren");
    expect(__normaliseFragmentForTests("Çağlar")).toBe("caglar");
  });

  it("drops non-alphanumerics", () => {
    expect(__normaliseFragmentForTests("Anna Müller")).toBe("annamueller");
    expect(__normaliseFragmentForTests("a   b")).toBe("ab");
    expect(__normaliseFragmentForTests("name-with-dashes")).toBe("namewithdashes");
  });

  it("returns empty string for empty input", () => {
    expect(__normaliseFragmentForTests("")).toBe("");
  });
});

describe("signatureKey", () => {
  it("produces identical keys for umlaut/ASCII pairs", () => {
    const a = signatureKey("Anna Müller", "a.mueller@example.com");
    const b = signatureKey("Anna Mueller", "a.mueller@example.com");
    expect(a).toBe(b);
  });

  it("uses email local-part only, not the domain", () => {
    expect(signatureKey("Alice", "alice@gmail.com")).toBe(
      signatureKey("Alice", "alice@workplace.io"),
    );
  });

  it("differentiates authors with the same name but different emails", () => {
    expect(signatureKey("Alex", "alex@a.com")).not.toBe(signatureKey("Alex", "different@b.com"));
  });

  it("handles missing email gracefully", () => {
    expect(signatureKey("Solo", null)).toBe("solo|");
    expect(signatureKey("Solo", undefined)).toBe("solo|");
  });

  it("handles missing name gracefully", () => {
    expect(signatureKey(null, "user@x.com")).toBe("|user");
  });
});

import { describe, expect, it } from "vitest";

import { normalizeProviderBaseUrl } from "@/lib/utils/url.utils";

describe("normalizeProviderBaseUrl", () => {
  it("returns empty string for blank input", () => {
    expect(normalizeProviderBaseUrl("")).toBe("");
    expect(normalizeProviderBaseUrl("   ")).toBe("");
  });

  it("prefixes https:// when no scheme is given", () => {
    expect(normalizeProviderBaseUrl("gitlab.example.com")).toBe("https://gitlab.example.com");
  });

  it("preserves an explicit http:// scheme", () => {
    expect(normalizeProviderBaseUrl("http://gitlab.internal")).toBe("http://gitlab.internal");
  });

  it("strips trailing slashes", () => {
    expect(normalizeProviderBaseUrl("https://gitlab.example.com/")).toBe(
      "https://gitlab.example.com",
    );
    expect(normalizeProviderBaseUrl("https://gitlab.example.com//")).toBe(
      "https://gitlab.example.com",
    );
  });

  it("trims surrounding whitespace before normalising", () => {
    expect(normalizeProviderBaseUrl("  gitlab.example.com  ")).toBe("https://gitlab.example.com");
  });
});

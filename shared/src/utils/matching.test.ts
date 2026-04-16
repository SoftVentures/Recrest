import { describe, expect, it } from "vitest";

import { isKnownProviderId, matchProviderFromRemote, parseOwnerRepo } from "./matching.js";

describe("matchProviderFromRemote", () => {
  it("detects GitHub", () => {
    expect(matchProviderFromRemote("https://github.com/foo/bar.git")).toBe("github");
    expect(matchProviderFromRemote("git@github.com:foo/bar.git")).toBe("github");
  });

  it("detects GitLab", () => {
    expect(matchProviderFromRemote("https://gitlab.com/foo/bar.git")).toBe("gitlab");
    expect(matchProviderFromRemote("git@gitlab.internal:foo/bar.git")).toBe("gitlab");
  });

  it("detects Bitbucket", () => {
    expect(matchProviderFromRemote("https://bitbucket.org/foo/bar")).toBe("bitbucket");
  });

  it("returns null for unknown hosts", () => {
    expect(matchProviderFromRemote("https://example.com/foo/bar")).toBeNull();
    expect(matchProviderFromRemote(null)).toBeNull();
  });
});

describe("parseOwnerRepo", () => {
  it("parses HTTPS URLs", () => {
    expect(parseOwnerRepo("https://github.com/foo/bar.git")).toEqual({ owner: "foo", repo: "bar" });
  });

  it("parses SSH URLs", () => {
    expect(parseOwnerRepo("git@github.com:foo/bar.git")).toEqual({ owner: "foo", repo: "bar" });
  });

  it("returns null on malformed input", () => {
    expect(parseOwnerRepo("not-a-url")).toBeNull();
  });
});

describe("isKnownProviderId", () => {
  it("accepts known ids", () => {
    expect(isKnownProviderId("github")).toBe(true);
  });

  it("rejects unknown ids", () => {
    expect(isKnownProviderId("codeberg")).toBe(false);
  });
});

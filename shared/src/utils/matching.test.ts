import { describe, expect, it } from "vitest";

import {
  isKnownProviderId,
  matchProviderFromRemote,
  parseOwnerRepo,
  remoteToWebUrl,
} from "./matching.js";

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

describe("remoteToWebUrl", () => {
  it("converts scp-like SSH to web URL", () => {
    expect(remoteToWebUrl("git@github.com:foo/bar.git")).toBe("https://github.com/foo/bar");
    expect(remoteToWebUrl("git@bitbucket.org:team/repo.git")).toBe(
      "https://bitbucket.org/team/repo",
    );
  });

  it("converts ssh:// scheme (with port + auth) to web URL", () => {
    expect(remoteToWebUrl("ssh://git@gitlab.example.com:22/team/proj.git")).toBe(
      "https://gitlab.example.com/team/proj",
    );
  });

  it("normalises https clone URLs (strips .git)", () => {
    expect(remoteToWebUrl("https://github.com/foo/bar.git")).toBe("https://github.com/foo/bar");
    expect(remoteToWebUrl("http://gitlab.internal/team/proj")).toBe(
      "https://gitlab.internal/team/proj",
    );
  });

  it("passes through an already-web URL unchanged", () => {
    expect(remoteToWebUrl("https://github.com/foo/bar")).toBe("https://github.com/foo/bar");
  });

  it("returns null for unparseable input", () => {
    expect(remoteToWebUrl(null)).toBeNull();
    expect(remoteToWebUrl("")).toBeNull();
    expect(remoteToWebUrl("git@github.com:")).toBeNull();
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

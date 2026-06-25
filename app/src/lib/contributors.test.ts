import { describe, expect, it } from "vitest";

import { normalizeContributors } from "@/lib/contributors";

describe("normalizeContributors", () => {
  it("returns an empty array for non-array input", () => {
    expect(normalizeContributors(null)).toEqual([]);
    expect(normalizeContributors(undefined)).toEqual([]);
    expect(normalizeContributors({})).toEqual([]);
    expect(normalizeContributors("nope")).toEqual([]);
  });

  it("ranks contributors by commit count descending", () => {
    const result = normalizeContributors([
      { login: "alice", contributions: 5 },
      { login: "bob", contributions: 42 },
      { login: "carol", contributions: 18 },
    ]);
    expect(result.map((c) => c.login)).toEqual(["bob", "carol", "alice"]);
  });

  it("drops entries without a usable login", () => {
    const result = normalizeContributors([
      { login: "", contributions: 9 },
      { contributions: 9 },
      { login: "real", contributions: 1 },
    ]);
    expect(result.map((c) => c.login)).toEqual(["real"]);
  });

  it("flags bots by type and by [bot] login suffix", () => {
    const result = normalizeContributors([
      { login: "renovate[bot]", contributions: 100, type: "Bot" },
      { login: "dependabot[bot]", contributions: 50, type: "User" },
      { login: "human", contributions: 200, type: "User" },
    ]);
    const byLogin = Object.fromEntries(result.map((c) => [c.login, c.isBot]));
    expect(byLogin["renovate[bot]"]).toBe(true);
    expect(byLogin["dependabot[bot]"]).toBe(true);
    expect(byLogin["human"]).toBe(false);
  });

  it("falls back to a derived profile url and zero contributions on partial data", () => {
    const [c] = normalizeContributors([{ login: "ghost" }]);
    expect(c).toBeDefined();
    expect(c?.profileUrl).toBe("https://github.com/ghost");
    expect(c?.contributions).toBe(0);
    expect(c?.avatarUrl).toBe("");
  });

  it("coerces non-string urls and avatars to safe defaults", () => {
    const [c] = normalizeContributors([
      { login: "x", avatar_url: 123, html_url: false, contributions: 3 },
    ]);
    expect(c?.avatarUrl).toBe("");
    expect(c?.profileUrl).toBe("https://github.com/x");
  });
});

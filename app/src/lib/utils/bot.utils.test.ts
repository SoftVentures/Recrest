import { describe, expect, it } from "vitest";

import { identifyBot, isBotAuthor } from "@/lib/utils/bot.utils";

describe("isBotAuthor", () => {
  it("recognises the GitHub App `[bot]` suffix", () => {
    expect(isBotAuthor("dependabot[bot]")).toBe(true);
    expect(isBotAuthor("github-actions[bot]")).toBe(true);
    expect(isBotAuthor("renovate[bot]")).toBe(true);
    expect(isBotAuthor("some-random-app[bot]")).toBe(true);
  });

  it("recognises well-known bot handles without the suffix", () => {
    expect(isBotAuthor("dependabot")).toBe(true);
    expect(isBotAuthor("renovate-bot")).toBe(true);
    expect(isBotAuthor("snyk-bot")).toBe(true);
    expect(isBotAuthor("github-actions")).toBe(true);
  });

  it("tolerates an `@` prefix", () => {
    expect(isBotAuthor("@dependabot[bot]")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBotAuthor("Dependabot[BOT]")).toBe(true);
    expect(isBotAuthor("RENOVATE")).toBe(true);
  });

  it("treats real users as non-bots", () => {
    expect(isBotAuthor("Ada Lovelace")).toBe(false);
    expect(isBotAuthor("alovelace")).toBe(false);
    expect(isBotAuthor("octocat")).toBe(false);
  });

  it("returns false for empty / nullish input", () => {
    expect(isBotAuthor(null)).toBe(false);
    expect(isBotAuthor(undefined)).toBe(false);
    expect(isBotAuthor("")).toBe(false);
    expect(isBotAuthor("   ")).toBe(false);
  });
});

describe("identifyBot", () => {
  it("maps well-known handles to their bot id (with and without the [bot] suffix)", () => {
    expect(identifyBot("figma")?.id).toBe("figma");
    expect(identifyBot("dependabot[bot]")?.id).toBe("dependabot");
    expect(identifyBot("renovate-bot")?.id).toBe("renovate");
    expect(identifyBot("github-actions[bot]")?.id).toBe("github-actions");
    expect(identifyBot("@codecov-commenter")?.id).toBe("codecov");
  });

  it("returns a brand colour for a recognised bot", () => {
    expect(identifyBot("figma")?.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("returns null for a generic [bot] that isn't in the registry", () => {
    // still a bot for `isBotAuthor`, but no specific brand identity
    expect(identifyBot("some-random-app[bot]")).toBeNull();
    expect(isBotAuthor("some-random-app[bot]")).toBe(true);
  });

  it("returns null for humans", () => {
    expect(identifyBot("Ada Lovelace")).toBeNull();
    expect(identifyBot("octocat")).toBeNull();
  });
});

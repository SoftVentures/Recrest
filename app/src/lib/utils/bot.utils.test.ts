import { describe, expect, it } from "vitest";

import { isBotAuthor } from "@/lib/utils/bot.utils";

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

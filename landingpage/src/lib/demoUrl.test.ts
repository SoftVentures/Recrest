import { describe, expect, it } from "vitest";

import { buildDemoUrl, toDemoLocale } from "./demoUrl";

describe("toDemoLocale", () => {
  it("normalizes regional German tags to de", () => {
    expect(toDemoLocale("de-DE")).toBe("de");
    expect(toDemoLocale("de")).toBe("de");
  });

  it("falls back to en for anything else", () => {
    expect(toDemoLocale("en-US")).toBe("en");
    expect(toDemoLocale("fr")).toBe("en");
    expect(toDemoLocale(undefined)).toBe("en");
  });
});

describe("buildDemoUrl", () => {
  it("builds the production URL under the landingpage base", () => {
    expect(buildDemoUrl({ base: "/Recrest/", dev: false, theme: "light", locale: "en" })).toBe(
      "/Recrest/demo/?theme=light&lng=en",
    );
  });

  it("targets the local dev:web server in dev mode", () => {
    expect(buildDemoUrl({ base: "/Recrest/", dev: true, theme: "dark", locale: "de" })).toBe(
      "http://localhost:3000/?theme=dark&lng=de",
    );
  });
});

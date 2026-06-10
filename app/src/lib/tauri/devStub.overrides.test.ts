import { describe, expect, it } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { type DevSeedOverrides, applySeedOverrides } from "@/lib/tauri/devStub.overrides";

describe("applySeedOverrides", () => {
  it("returns the seed untouched when no overrides are given", () => {
    expect(applySeedOverrides(DEFAULT_SEED, undefined)).toBe(DEFAULT_SEED);
  });

  it("overrides themeId and pins followsSystem off", () => {
    const overrides: DevSeedOverrides = { themeId: "dark" };
    const result = applySeedOverrides(DEFAULT_SEED, overrides);
    expect(result.settings.appearance.themeId).toBe("dark");
    expect(result.settings.appearance.followsSystem).toBe(false);
  });

  it("does not mutate the input seed", () => {
    const before = DEFAULT_SEED.settings.appearance.themeId;
    applySeedOverrides(DEFAULT_SEED, { themeId: "dark" });
    expect(DEFAULT_SEED.settings.appearance.themeId).toBe(before);
  });
});

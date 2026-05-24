import { describe, expect, it } from "vitest";

import { pickLogoPath } from "@/lib/utils/repoLogo.utils";

describe("pickLogoPath", () => {
  it("returns the dark path in dark mode when available", () => {
    expect(pickLogoPath("/light.svg", "/dark.svg", true)).toBe("/dark.svg");
  });

  it("falls back to the light path in dark mode when no dark variant exists", () => {
    expect(pickLogoPath("/light.svg", null, true)).toBe("/light.svg");
  });

  it("returns the light path in light mode even when dark exists", () => {
    expect(pickLogoPath("/light.svg", "/dark.svg", false)).toBe("/light.svg");
  });

  it("falls back to the dark path in light mode when no light variant exists", () => {
    expect(pickLogoPath(null, "/dark.svg", false)).toBe("/dark.svg");
  });

  it("returns null when both paths are missing", () => {
    expect(pickLogoPath(null, null, false)).toBeNull();
    expect(pickLogoPath(null, null, true)).toBeNull();
  });
});

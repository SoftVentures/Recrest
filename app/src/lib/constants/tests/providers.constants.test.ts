import { describe, expect, it } from "vitest";

import {
  PROVIDER_BRAND_ICONS,
  PROVIDER_IDS,
  type ProviderId,
} from "@/lib/constants/providers.constants";

describe("provider constants", () => {
  it("PROVIDER_BRAND_ICONS has an entry for every ProviderId", () => {
    const expected = new Set<ProviderId>(PROVIDER_IDS);
    const actual = new Set(Object.keys(PROVIDER_BRAND_ICONS));
    expect(actual).toEqual(expected);
  });

  it("each brand icon carries a non-empty SVG path", () => {
    for (const slug of PROVIDER_IDS) {
      const icon = PROVIDER_BRAND_ICONS[slug];
      expect(icon.path.length).toBeGreaterThan(10);
      expect(icon.hex).toMatch(/^[0-9A-F]{6}$/i);
    }
  });
});

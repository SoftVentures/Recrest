import { describe, expect, it } from "vitest";

import { REPO_STATUS_CHIPS, REPO_STATUS_CHIP_UI } from "@/lib/constants/statusChips.constants";

describe("repo-status-chip constants", () => {
  it("REPO_STATUS_CHIP_UI covers every chip id", () => {
    expect(Object.keys(REPO_STATUS_CHIP_UI).sort()).toEqual([...REPO_STATUS_CHIPS].sort());
  });

  it("each chip carries a tone and an i18n label key", () => {
    for (const chip of REPO_STATUS_CHIPS) {
      const ui = REPO_STATUS_CHIP_UI[chip];
      expect(ui.tone.length).toBeGreaterThan(0);
      expect(ui.labelKey).toBe(`repos.chip.${chip}`);
    }
  });
});

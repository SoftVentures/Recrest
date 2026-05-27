import { describe, expect, it } from "vitest";

import { CI_STATES, CI_STATE_UI, ciFor } from "@/lib/constants/ciStates.constants";

describe("CI-state constants", () => {
  it("CI_STATE_UI covers every CiStatus", () => {
    expect(Object.keys(CI_STATE_UI).sort()).toEqual([...CI_STATES].sort());
  });

  it("each entry maps to a tone slug and a typed i18n key", () => {
    for (const state of CI_STATES) {
      const ui = CI_STATE_UI[state];
      expect(ui.tone.length).toBeGreaterThan(0);
      expect(ui.labelKey).toBe(`ci.${state}`);
    }
  });

  describe("ciFor()", () => {
    it("returns null for nullish / unknown inputs", () => {
      expect(ciFor(null)).toBeNull();
      expect(ciFor(undefined)).toBeNull();
      expect(ciFor("totally-unknown")).toBeNull();
    });

    it("maps backend states onto the UI tone vocabulary", () => {
      expect(ciFor("success")).toBe("passing");
      expect(ciFor("failure")).toBe("failing");
      expect(ciFor("running")).toBe("running");
      expect(ciFor("pending")).toBe("running");
    });

    it("returns null for the no-checks-reported state (renders no pill)", () => {
      expect(ciFor("none")).toBeNull();
    });
  });
});

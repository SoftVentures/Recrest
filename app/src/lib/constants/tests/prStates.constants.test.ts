import { describe, expect, it } from "vitest";

import { PR_STATES, PR_STATE_UI } from "@/lib/constants/prStates.constants";

describe("PR-state constants", () => {
  it("PR_STATE_UI covers every PrState", () => {
    expect(Object.keys(PR_STATE_UI).sort()).toEqual([...PR_STATES].sort());
  });

  it("each entry maps to a tone slug and a typed i18n key", () => {
    for (const state of PR_STATES) {
      const ui = PR_STATE_UI[state];
      expect(ui.tone.length).toBeGreaterThan(0);
      expect(ui.labelKey).toBe(`prs.state.${state}`);
    }
  });
});

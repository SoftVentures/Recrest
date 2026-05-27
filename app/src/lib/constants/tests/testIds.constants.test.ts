import { describe, expect, it } from "vitest";

import { TEST_IDS, navCountTestId, navTestId } from "@/lib/constants/testIds.constants";

/** Walk the nested TEST_IDS object and collect every string leaf. */
function collectStaticIds(node: unknown, out: string[] = []): string[] {
  if (typeof node === "string") {
    out.push(node);
  } else if (node && typeof node === "object" && !Array.isArray(node)) {
    for (const value of Object.values(node)) collectStaticIds(value, out);
  }
  return out;
}

describe("TEST_IDS registry", () => {
  it("contains only non-empty kebab-case strings at the leaves", () => {
    const ids = collectStaticIds(TEST_IDS);
    expect(ids.length).toBeGreaterThan(100);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it("has no duplicate static ids across domains", () => {
    const ids = collectStaticIds(TEST_IDS);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    expect(dupes).toEqual([]);
  });

  it("exposes generator functions that return well-formed templates", () => {
    expect(TEST_IDS.settings.tab("general")).toBe("settings-tab-general");
    expect(TEST_IDS.settings.panel("appearance")).toBe("settings-panel-appearance");
    expect(TEST_IDS.settings.general.accentChip("orange")).toBe("accent-chip-orange");
    expect(TEST_IDS.settings.general.notifications("ci-failed")).toBe(
      "settings-notifications-ci-failed",
    );
    expect(TEST_IDS.settings.integrations.scanRemove("/repos")).toBe("settings-scan-remove-/repos");
    expect(TEST_IDS.settings.developer.flag("my-flag")).toBe("dev-flag-my-flag");
    expect(TEST_IDS.searchOverlay.row("repo")).toBe("search-row-repo");
  });

  it("nav helpers strip the leading slash and collapse remaining slashes", () => {
    expect(navTestId("/dashboard")).toBe("nav-dashboard");
    expect(navTestId("/merge-requests")).toBe("nav-merge-requests");
    expect(navTestId("dashboard")).toBe("nav-dashboard");
    expect(navCountTestId("/repos")).toBe("nav-repos-count");
  });

  it("exposes the sidebar nav helpers under TEST_IDS.sidebar.nav for ergonomic use", () => {
    expect(TEST_IDS.sidebar.nav("/dashboard")).toBe("nav-dashboard");
    expect(TEST_IDS.sidebar.navCount("/repos")).toBe("nav-repos-count");
  });
});

import { describe, expect, it } from "vitest";

import {
  REPO_ACTIVE_SORT_KEYS,
  REPO_SORT_KEYS,
  REPO_SORT_UI,
  type RepoSortKey,
} from "@/lib/constants/sortKeys.constants";

describe("repo-sort-key constants", () => {
  it("REPO_SORT_UI covers every sort key", () => {
    expect(Object.keys(REPO_SORT_UI).sort()).toEqual([...REPO_SORT_KEYS].sort());
  });

  it("REPO_ACTIVE_SORT_KEYS excludes the default baseline", () => {
    expect(REPO_ACTIVE_SORT_KEYS).not.toContain("default" as RepoSortKey);
    expect(REPO_ACTIVE_SORT_KEYS).toHaveLength(REPO_SORT_KEYS.length - 1);
  });

  it("every label key lives in the repos namespace", () => {
    for (const key of REPO_SORT_KEYS) {
      expect(REPO_SORT_UI[key].labelKey.startsWith("repos.sort.")).toBe(true);
    }
  });
});

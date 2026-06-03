import { REPO_SORT_KEYS, type RepoSortKey } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import {
  sortKeyFromBackend,
  sortKeyToBackend,
  viewFromBackend,
  viewToBackend,
} from "@/lib/utils/repoSort.utils";

describe("repoSort mappers", () => {
  it("round-trips every active sort key through the backend shape", () => {
    for (const key of REPO_SORT_KEYS) {
      expect(sortKeyFromBackend(sortKeyToBackend(key))).toBe(key);
    }
  });

  it("maps explicit sorts to field + direction", () => {
    expect(sortKeyToBackend("name:desc")).toEqual({ field: "name", direction: "desc" });
    expect(sortKeyToBackend("lastModified:desc")).toEqual({
      field: "lastModified",
      direction: "desc",
    });
    expect(sortKeyToBackend("status:asc")).toEqual({ field: "status", direction: "asc" });
  });

  it("treats an empty/unknown field as the default grouped sort", () => {
    expect(sortKeyFromBackend({ field: "", direction: "asc" })).toBe<RepoSortKey>("default");
    expect(sortKeyFromBackend({ field: "whatever", direction: "asc" })).toBe<RepoSortKey>(
      "default",
    );
  });

  it("maps view + sort to the persisted view mode", () => {
    expect(viewToBackend("card", "name:asc")).toBe("card");
    expect(viewToBackend("list", "default")).toBe("grouped");
    expect(viewToBackend("list", "name:asc")).toBe("flat");
  });

  it("collapses grouped and flat back to the list view", () => {
    expect(viewFromBackend("grouped")).toBe("list");
    expect(viewFromBackend("flat")).toBe("list");
    expect(viewFromBackend("card")).toBe("card");
  });
});

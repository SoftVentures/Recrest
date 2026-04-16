import { describe, expect, it } from "vitest";

import { formatBranchName, formatRelativeTime, pluralize, truncatePath } from "./formatting.js";

describe("formatRelativeTime", () => {
  const now = new Date("2026-04-16T12:00:00Z");

  it("returns 'just now' for sub-minute diffs", () => {
    expect(formatRelativeTime("2026-04-16T11:59:30Z", now)).toBe("just now");
  });

  it("formats minutes", () => {
    expect(formatRelativeTime("2026-04-16T11:55:00Z", now)).toBe("5 minutes ago");
  });

  it("handles future timestamps", () => {
    expect(formatRelativeTime("2026-04-16T12:10:00Z", now)).toBe("10 minutes from now");
  });
});

describe("truncatePath", () => {
  it("keeps short paths intact", () => {
    expect(truncatePath("/a/b/c")).toBe("/a/b/c");
  });

  it("truncates long paths with head and tail", () => {
    const path = "/very/deeply/nested/path/to/my/project/repository";
    const result = truncatePath(path, 30);
    expect(result.length).toBeLessThanOrEqual(30);
    expect(result).toContain("…");
  });
});

describe("formatBranchName", () => {
  it("strips refs/heads/ prefix", () => {
    expect(formatBranchName("refs/heads/main")).toBe("main");
  });

  it("falls back for null", () => {
    expect(formatBranchName(null)).toBe("—");
  });
});

describe("pluralize", () => {
  it("returns singular for 1", () => {
    expect(pluralize(1, "repo")).toBe("repo");
  });

  it("returns plural otherwise", () => {
    expect(pluralize(2, "repo")).toBe("repos");
  });

  it("uses explicit plural when given", () => {
    expect(pluralize(3, "child", "children")).toBe("children");
  });
});

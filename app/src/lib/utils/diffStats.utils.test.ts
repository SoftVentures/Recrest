import { FileChangeStatus, type FileDiff } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import { deriveDiffStats } from "@/lib/utils/diffStats.utils";

function file(adds: number, dels: number, path = "a"): FileDiff {
  const lines = [
    ...Array.from({ length: adds }, (_, i) => ({
      kind: "add" as const,
      content: `+${i}`,
      oldLineNo: null,
      newLineNo: i + 1,
    })),
    ...Array.from({ length: dels }, (_, i) => ({
      kind: "remove" as const,
      content: `-${i}`,
      oldLineNo: i + 1,
      newLineNo: null,
    })),
  ];
  return {
    path,
    oldPath: null,
    status: FileChangeStatus.MODIFIED,
    hunks: [{ oldStart: 1, oldLines: dels, newStart: 1, newLines: adds, lines }],
  };
}

describe("deriveDiffStats", () => {
  it("returns zeroed stats for empty / undefined input", () => {
    expect(deriveDiffStats(undefined)).toEqual({ files: 0, additions: 0, deletions: 0 });
    expect(deriveDiffStats([])).toEqual({ files: 0, additions: 0, deletions: 0 });
  });

  it("counts adds and removes across multiple files", () => {
    const diff = [file(3, 1, "a"), file(0, 5, "b"), file(7, 2, "c")];
    expect(deriveDiffStats(diff)).toEqual({ files: 3, additions: 10, deletions: 8 });
  });

  it("ignores context lines", () => {
    const diff: FileDiff[] = [
      {
        path: "ctx",
        oldPath: null,
        status: FileChangeStatus.MODIFIED,
        hunks: [
          {
            oldStart: 1,
            oldLines: 2,
            newStart: 1,
            newLines: 2,
            lines: [
              { kind: "context", content: "x", oldLineNo: 1, newLineNo: 1 },
              { kind: "context", content: "y", oldLineNo: 2, newLineNo: 2 },
            ],
          },
        ],
      },
    ];
    expect(deriveDiffStats(diff)).toEqual({ files: 1, additions: 0, deletions: 0 });
  });
});

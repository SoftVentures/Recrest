import { type Comment, type FileDiff } from "@recrest/shared";

import { fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DiffView from "@/components/molecules/diff/DiffView";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

// The real RichTextEditor mounts TipTap/ProseMirror which depends on
// `contenteditable` semantics jsdom can't fully emulate (no `value` setter
// on the underlying node). Swap it for a plain textarea here so we can
// exercise the composer flow without pulling the editor into scope — TipTap
// has its own test coverage upstream.
vi.mock("@/components/atoms/text/RichTextEditor", () => ({
  default: ({
    value,
    onChange,
    placeholder,
    "data-testid": testId,
  }: {
    value: string;
    onChange: (next: string) => void;
    placeholder?: string;
    "data-testid"?: string;
  }) => (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      data-testid={testId}
    />
  ),
}));

const FILES: FileDiff[] = [
  {
    path: "src/lib.rs",
    oldPath: null,
    status: "modified",
    hunks: [
      {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 4,
        lines: [
          { kind: "context", content: "use foo;", oldLineNo: 1, newLineNo: 1 },
          { kind: "remove", content: "use bar;", oldLineNo: 2, newLineNo: null },
          { kind: "add", content: "use bar2;", oldLineNo: null, newLineNo: 2 },
          { kind: "context", content: "pub fn x() {}", oldLineNo: 3, newLineNo: 4 },
        ],
      },
    ],
  },
];

function bigFile(path: string, lines: number): FileDiff {
  return {
    path,
    oldPath: null,
    status: "modified",
    hunks: [
      {
        oldStart: 1,
        oldLines: lines,
        newStart: 1,
        newLines: lines,
        lines: Array.from({ length: lines }, (_, i) => ({
          kind: "context" as const,
          content: `line ${i}`,
          oldLineNo: i + 1,
          newLineNo: i + 1,
        })),
      },
    ],
  };
}

describe("DiffView", () => {
  it("renders one file block with all hunk lines", () => {
    const { getAllByTestId } = renderWithProviders(<DiffView files={FILES} />);
    expect(getAllByTestId(TEST_IDS.mr.diff.file)).toHaveLength(1);
    expect(getAllByTestId(TEST_IDS.mr.diff.line)).toHaveLength(4);
  });

  it("collapses a file larger than the render budget by default, expanding on click", () => {
    const { getAllByTestId, queryAllByTestId } = renderWithProviders(
      <DiffView files={[bigFile("src/huge.ts", 400)]} />,
    );
    // Header is present but no lines are mounted while collapsed.
    expect(getAllByTestId(TEST_IDS.mr.diff.file)).toHaveLength(1);
    expect(queryAllByTestId(TEST_IDS.mr.diff.line)).toHaveLength(0);
    // Expanding renders the lines on demand.
    fireEvent.click(getAllByTestId(TEST_IDS.mr.diff.fileToggle)[0]!);
    expect(queryAllByTestId(TEST_IDS.mr.diff.line)).toHaveLength(400);
  });

  it("does not show comment affordances when onComment is absent", () => {
    const { queryByTestId } = renderWithProviders(<DiffView files={FILES} />);
    expect(queryByTestId(TEST_IDS.mr.diff.commentBtn)).toBeNull();
  });

  it("press-release on one line submits a single-line comment with both line numbers resolved", async () => {
    const onComment = vi.fn().mockResolvedValue(undefined);
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <DiffView files={FILES} onComment={onComment} />,
    );

    // Press the affordance on the added line (the 3rd row → RIGHT/new=2) and
    // release without dragging. The absent old side resolves to the running old
    // position (3) from the hunk.
    const buttons = getAllByTestId(TEST_IDS.mr.diff.commentBtn);
    fireEvent.mouseDown(buttons[2]!);
    fireEvent.mouseUp(document);

    const input = getByTestId(TEST_IDS.mr.diff.composerInput);
    fireEvent.change(input, { target: { value: "nice" } });
    fireEvent.click(getByTestId(TEST_IDS.mr.diff.composerSubmit));

    await waitFor(() => expect(onComment).toHaveBeenCalledTimes(1));
    const [path, position, body] = onComment.mock.calls[0]!;
    expect(path).toBe("src/lib.rs");
    expect(position).toEqual({
      start: null,
      end: { side: "RIGHT", oldLineNo: 3, newLineNo: 2 },
    });
    expect(body).toBe("nice");
  });

  it("dragging from one line to another submits a multi-line range position", async () => {
    const onComment = vi.fn().mockResolvedValue(undefined);
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <DiffView files={FILES} onComment={onComment} />,
    );

    const buttons = getAllByTestId(TEST_IDS.mr.diff.commentBtn);
    const lines = getAllByTestId(TEST_IDS.mr.diff.line);
    // Press on the added line (RIGHT/new=2), then sweep onto the last context
    // line (RIGHT/new=4). The drag extends via a window mousemove + hit-test
    // (browsers capture mouse events to the press target, so per-line
    // mouseenter never fires). jsdom has no layout, so stub elementFromPoint
    // to return the line under the "cursor".
    const original = document.elementFromPoint;
    document.elementFromPoint = (() => lines[3]!) as typeof document.elementFromPoint;
    fireEvent.mouseDown(buttons[2]!);
    fireEvent.mouseMove(window, { clientX: 10, clientY: 60 });
    fireEvent.mouseUp(document);
    document.elementFromPoint = original;

    const input = getByTestId(TEST_IDS.mr.diff.composerInput);
    fireEvent.change(input, { target: { value: "range note" } });
    fireEvent.click(getByTestId(TEST_IDS.mr.diff.composerSubmit));

    await waitFor(() => expect(onComment).toHaveBeenCalledTimes(1));
    const [, position] = onComment.mock.calls[0]!;
    expect(position).toEqual({
      start: { side: "RIGHT", oldLineNo: 3, newLineNo: 2 },
      end: { side: "RIGHT", oldLineNo: 3, newLineNo: 4 },
    });
  });

  it("dragging from a removed line to an added line keeps each boundary's side", async () => {
    const onComment = vi.fn().mockResolvedValue(undefined);
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <DiffView files={FILES} onComment={onComment} />,
    );

    const buttons = getAllByTestId(TEST_IDS.mr.diff.commentBtn);
    const lines = getAllByTestId(TEST_IDS.mr.diff.line);
    // Press on the removed line (LEFT/old=2), sweep onto the added line
    // (RIGHT/new=2). The range must cross sides: start LEFT, end RIGHT.
    const original = document.elementFromPoint;
    document.elementFromPoint = (() => lines[2]!) as typeof document.elementFromPoint;
    fireEvent.mouseDown(buttons[1]!);
    fireEvent.mouseMove(window, { clientX: 10, clientY: 40 });
    fireEvent.mouseUp(document);
    document.elementFromPoint = original;

    const input = getByTestId(TEST_IDS.mr.diff.composerInput);
    fireEvent.change(input, { target: { value: "deletion to addition" } });
    fireEvent.click(getByTestId(TEST_IDS.mr.diff.composerSubmit));

    await waitFor(() => expect(onComment).toHaveBeenCalledTimes(1));
    const [, position] = onComment.mock.calls[0]!;
    expect(position).toEqual({
      start: { side: "LEFT", oldLineNo: 2, newLineNo: 2 },
      end: { side: "RIGHT", oldLineNo: 3, newLineNo: 2 },
    });
  });

  it("renders a line-anchored comment and a range badge next to its line", () => {
    const comments: Comment[] = [
      {
        id: "c1",
        author: "alice",
        authorAvatarUrl: null,
        body: "single",
        path: "src/lib.rs",
        side: "RIGHT",
        line: 2,
        startLine: null,
        startSide: null,
        createdAt: "2026-01-01T00:00:00Z",
      },
      {
        id: "c2",
        author: "bob",
        authorAvatarUrl: null,
        body: "spans",
        path: "src/lib.rs",
        side: "RIGHT",
        line: 4,
        startLine: 2,
        startSide: "RIGHT",
        createdAt: "2026-01-01T00:00:00Z",
      },
    ];
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <DiffView files={FILES} comments={comments} />,
    );
    expect(getAllByTestId(TEST_IDS.mr.diff.postedComment)).toHaveLength(2);
    expect(getByTestId(TEST_IDS.mr.diff.rangeBadge).textContent).toContain("L2–4");
  });

  it("renders an empty state when there are no files", () => {
    const { container } = renderWithProviders(<DiffView files={[]} />);
    expect(container.textContent).toContain("No changes to show.");
  });
});

import { type FileDiff } from "@recrest/shared";

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

describe("DiffView", () => {
  it("renders one file block with all hunk lines", () => {
    const { getAllByTestId } = renderWithProviders(<DiffView files={FILES} />);
    expect(getAllByTestId(TEST_IDS.mr.diff.file)).toHaveLength(1);
    expect(getAllByTestId(TEST_IDS.mr.diff.line)).toHaveLength(4);
  });

  it("does not show comment affordances when onComment is absent", () => {
    const { queryByTestId } = renderWithProviders(<DiffView files={FILES} />);
    expect(queryByTestId(TEST_IDS.mr.diff.commentBtn)).toBeNull();
  });

  it("opens the composer and submits an inline comment with the right position", async () => {
    const onComment = vi.fn().mockResolvedValue(undefined);
    const { getAllByTestId, getByTestId } = renderWithProviders(
      <DiffView files={FILES} onComment={onComment} />,
    );

    // Click the comment affordance on the added line (the 3rd row → RIGHT/new=2).
    const buttons = getAllByTestId(TEST_IDS.mr.diff.commentBtn);
    fireEvent.click(buttons[2]!);

    const input = getByTestId(TEST_IDS.mr.diff.composerInput);
    fireEvent.change(input, { target: { value: "nice" } });
    fireEvent.click(getByTestId(TEST_IDS.mr.diff.composerSubmit));

    await waitFor(() => expect(onComment).toHaveBeenCalledTimes(1));
    const [path, position, body] = onComment.mock.calls[0]!;
    expect(path).toBe("src/lib.rs");
    expect(position).toEqual({ side: "RIGHT", line: 2, startLine: null });
    expect(body).toBe("nice");
  });

  it("renders an empty state when there are no files", () => {
    const { container } = renderWithProviders(<DiffView files={[]} />);
    expect(container.textContent).toContain("No changes to show.");
  });
});

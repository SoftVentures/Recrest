import type { ChangedFile } from "@recrest/shared";
import { ChangedFileKind, ChangedFileStatus } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import ChangedFilesList from "@/components/organisms/repos/ChangedFilesList";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const FILES: ChangedFile[] = [
  {
    path: "src/foo.ts",
    status: ChangedFileStatus.UNSTAGED,
    kind: ChangedFileKind.MODIFIED,
    hasUnstagedChanges: false,
  },
  {
    path: "src/bar.ts",
    status: ChangedFileStatus.UNSTAGED,
    kind: ChangedFileKind.ADDED,
    hasUnstagedChanges: false,
  },
];

describe("ChangedFilesList", () => {
  it("renders one row per file", () => {
    const { getAllByTestId, getByTestId } = renderWithProviders(<ChangedFilesList files={FILES} />);
    expect(getByTestId(TEST_IDS.changedFilesList.root)).toBeTruthy();
    expect(getAllByTestId(TEST_IDS.changedFilesList.row)).toHaveLength(2);
  });

  it("shows the truncated marker when requested", () => {
    const { getByTestId } = renderWithProviders(<ChangedFilesList files={FILES} truncated />);
    expect(getByTestId(TEST_IDS.changedFilesList.truncated)).toBeTruthy();
  });

  it("omits the truncated marker by default", () => {
    const { queryByTestId } = renderWithProviders(<ChangedFilesList files={FILES} />);
    expect(queryByTestId(TEST_IDS.changedFilesList.truncated)).toBeNull();
  });
});

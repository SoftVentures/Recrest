import { ChangedFileKind, ChangedFileStatus } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import ChangesPage from "@/pages/app/Changes";
import { renderWithProviders } from "@/test/utils";

const useEnrichedReposMock = vi.fn<() => EnrichedRepo[]>();

vi.mock("@/hooks/useEnrichedRepos", () => ({
  useEnrichedRepos: () => useEnrichedReposMock(),
}));

function makeRepo(id: string, name: string, filePath: string, dirty = true): EnrichedRepo {
  return {
    id,
    name,
    path: `/Users/dev/${name}`,
    added: 5,
    removed: 2,
    filesChanged: 1,
    status: {
      branch: "main",
      dirty,
      changedFiles: [
        {
          path: filePath,
          status: ChangedFileStatus.UNSTAGED,
          kind: ChangedFileKind.MODIFIED,
          hasUnstagedChanges: true,
        },
      ],
      changedFilesTruncated: false,
    },
  } as unknown as EnrichedRepo;
}

describe("ChangesPage", () => {
  beforeEach(() => {
    useEnrichedReposMock.mockReset();
  });

  it("shows the clean empty state when no repo is dirty", () => {
    useEnrichedReposMock.mockReturnValue([makeRepo("a", "alpha", "src/a.ts", false)]);
    const { getByText, queryByTestId } = renderWithProviders(<ChangesPage />);
    expect(getByText("No uncommitted changes")).toBeInTheDocument();
    expect(queryByTestId(TEST_IDS.changes.row)).toBeNull();
  });

  it("renders one row per dirty repo", () => {
    useEnrichedReposMock.mockReturnValue([
      makeRepo("a", "alpha", "src/alpha.ts"),
      makeRepo("b", "beta", "src/beta.ts"),
    ]);
    const { getAllByTestId } = renderWithProviders(<ChangesPage />);
    expect(getAllByTestId(TEST_IDS.changes.row)).toHaveLength(2);
  });

  it("reveals the changed files only after expanding a row", () => {
    useEnrichedReposMock.mockReturnValue([makeRepo("a", "alpha", "src/alpha.ts")]);
    const { getByRole, queryByText, getByText } = renderWithProviders(<ChangesPage />);
    expect(queryByText("src/alpha.ts")).toBeNull();
    fireEvent.click(getByRole("button", { name: /expand changed files/i }));
    expect(getByText("src/alpha.ts")).toBeInTheDocument();
  });

  it("filters repos by changed file path", () => {
    useEnrichedReposMock.mockReturnValue([
      makeRepo("a", "alpha", "src/alpha.ts"),
      makeRepo("b", "beta", "src/beta.ts"),
    ]);
    const { getByRole, getAllByTestId } = renderWithProviders(<ChangesPage />);
    fireEvent.change(getByRole("textbox"), { target: { value: "alpha.ts" } });
    const rows = getAllByTestId(TEST_IDS.changes.row);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.getAttribute("data-repo-id")).toBe("a");
  });

  it("shows the no-matches empty state when the filter excludes everything", () => {
    useEnrichedReposMock.mockReturnValue([makeRepo("a", "alpha", "src/alpha.ts")]);
    const { getByRole, getByText, queryByTestId } = renderWithProviders(<ChangesPage />);
    fireEvent.change(getByRole("textbox"), { target: { value: "zzz-nope" } });
    expect(getByText("No matches")).toBeInTheDocument();
    expect(queryByTestId(TEST_IDS.changes.row)).toBeNull();
  });
});

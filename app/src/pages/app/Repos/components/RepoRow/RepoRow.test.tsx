import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import type { EnrichedRepo } from "@/lib/repoEnrich";
import { RepoRow } from "@/pages/app/Repos/components/RepoRow";
import { renderWithProviders } from "@/test/utils";

function makeRepo(overrides: Partial<EnrichedRepo> = {}): EnrichedRepo {
  return {
    id: "r1",
    name: "alpha",
    path: "/x/alpha",
    group: "Local",
    pinned: false,
    status: { branch: "main", ahead: 0, behind: 0, dirty: false },
    added: 0,
    removed: 0,
    filesChanged: 0,
    activity: [],
    ...overrides,
  } as EnrichedRepo;
}

describe("RepoRow", () => {
  it("marks a repo whose folder vanished and offers the removal shortcut", () => {
    renderWithProviders(<RepoRow repo={makeRepo({ missing: true })} onClick={vi.fn()} />);

    expect(screen.getByTestId(TEST_IDS.repos.missingBadge)).toBeTruthy();
    expect(screen.getByTestId(TEST_IDS.repos.row).getAttribute("data-missing")).toBe("true");
    expect(screen.getByTestId(TEST_IDS.repos.rowForget)).toBeTruthy();
  });

  it("renders no missing marker when the folder is present", () => {
    renderWithProviders(<RepoRow repo={makeRepo({ missing: false })} onClick={vi.fn()} />);

    expect(screen.queryByTestId(TEST_IDS.repos.missingBadge)).toBeNull();
    expect(screen.queryByTestId(TEST_IDS.repos.rowForget)).toBeNull();
    expect(screen.getByTestId(TEST_IDS.repos.row).getAttribute("data-missing")).toBeNull();
  });

  it("opens the forget confirmation straight from the removal shortcut", () => {
    renderWithProviders(<RepoRow repo={makeRepo({ missing: true })} onClick={vi.fn()} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.repos.rowForget));

    expect(screen.getByTestId(TEST_IDS.confirmDialog.root)).toBeTruthy();
  });

  it("renders no missing marker when the flag is absent altogether", () => {
    renderWithProviders(<RepoRow repo={makeRepo()} onClick={vi.fn()} />);

    expect(screen.queryByTestId(TEST_IDS.repos.missingBadge)).toBeNull();
    expect(screen.queryByTestId(TEST_IDS.repos.rowForget)).toBeNull();
  });

  it("toggles pin via the inline pin button without opening the menu", () => {
    const { store } = renderWithProviders(<RepoRow repo={makeRepo()} onClick={vi.fn()} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.repos.rowPinToggle));

    expect(store.getState().ui.pinnedRepoIds).toContain("r1");
  });

  it("inline pin click does not trigger the row's onClick", () => {
    const onClick = vi.fn();
    renderWithProviders(<RepoRow repo={makeRepo()} onClick={onClick} />);

    fireEvent.click(screen.getByTestId(TEST_IDS.repos.rowPinToggle));

    expect(onClick).not.toHaveBeenCalled();
  });
});

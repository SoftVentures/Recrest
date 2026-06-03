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

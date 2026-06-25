import { fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OverallSearch from "@/components/organisms/OverallSearch";
import { SearchTab } from "@/lib/constants/searchKinds.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { makeTestStore, renderWithProviders } from "@/test/utils";

describe("OverallSearch", () => {
  it("does not render the search overlay while closed", () => {
    const { queryByTestId } = renderWithProviders(<OverallSearch />);
    expect(queryByTestId(TEST_IDS.searchOverlay.root)).toBeNull();
  });

  it("shows both tabs when open, both enabled regardless of the active repo", () => {
    const store = makeTestStore({ ui: { searchOpen: true, selectedRepoId: null } });
    const { getByTestId } = renderWithProviders(<OverallSearch />, { store });

    expect(getByTestId(TEST_IDS.searchOverlay.tab(SearchTab.GLOBAL))).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.searchOverlay.tab(SearchTab.REPO))).toBeEnabled();
  });

  it("shows the content-scope filter and the min-length hint on the content tab", () => {
    const store = makeTestStore({ ui: { searchOpen: true } });
    const { getByTestId } = renderWithProviders(<OverallSearch />, { store });

    fireEvent.click(getByTestId(TEST_IDS.searchOverlay.tab(SearchTab.REPO)));
    expect(getByTestId(TEST_IDS.searchOverlay.scopeSelect)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.searchOverlay.contentHint)).toBeInTheDocument();
  });
});

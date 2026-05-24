import { describe, expect, it } from "vitest";

import OverallSearch from "@/components/organisms/OverallSearch";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("OverallSearch", () => {
  it("does not render the search overlay while closed", () => {
    const { queryByTestId } = renderWithProviders(<OverallSearch />);
    expect(queryByTestId(TEST_IDS.searchOverlay.root)).toBeNull();
  });
});

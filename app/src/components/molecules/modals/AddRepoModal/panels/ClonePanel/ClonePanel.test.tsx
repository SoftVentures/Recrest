import { describe, expect, it } from "vitest";

import ClonePanel from "@/components/molecules/modals/AddRepoModal/panels/ClonePanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ClonePanel", () => {
  it("renders the URL and destination inputs", () => {
    const { getByTestId } = renderWithProviders(<ClonePanel onClose={() => {}} />);
    expect(getByTestId(TEST_IDS.addRepoDialog.url)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.addRepoDialog.dest)).toBeInTheDocument();
  });
});

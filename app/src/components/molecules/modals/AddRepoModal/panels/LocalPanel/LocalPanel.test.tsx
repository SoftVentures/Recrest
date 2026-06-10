import { describe, expect, it } from "vitest";

import LocalPanel from "@/components/molecules/modals/AddRepoModal/panels/LocalPanel";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("LocalPanel", () => {
  it("renders the path input", () => {
    const { getByTestId } = renderWithProviders(<LocalPanel onClose={() => {}} />);
    expect(getByTestId(TEST_IDS.addRepoDialog.path)).toBeInTheDocument();
  });
});

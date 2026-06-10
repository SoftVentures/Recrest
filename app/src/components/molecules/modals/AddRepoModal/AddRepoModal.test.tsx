import { describe, expect, it } from "vitest";

import AddRepoModal from "@/components/molecules/modals/AddRepoModal";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("AddRepoModal", () => {
  it("does not render the dialog while the import flag is off", () => {
    const { queryByTestId } = renderWithProviders(<AddRepoModal />);
    expect(queryByTestId(TEST_IDS.addRepoDialog.root)).toBeNull();
  });
});

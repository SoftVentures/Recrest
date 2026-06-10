import { describe, expect, it } from "vitest";

import MrDetailDrawer from "@/components/molecules/drawers/MrDetailDrawer";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("MrDetailDrawer", () => {
  it("does not render the drawer body when pr is null", () => {
    const { queryByTestId } = renderWithProviders(
      <MrDetailDrawer pr={null} repoId="demo" onClose={() => {}} />,
    );
    expect(queryByTestId(TEST_IDS.mr.drawer)).toBeNull();
  });
});

import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralDrawer from "@/components/molecules/drawers/GeneralDrawer";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralDrawer", () => {
  it("renders its body when open", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralDrawer open onClose={() => {}}>
        <Box data-testid={COMPONENT_TEST_IDS.molecules.drawer.body}>drawer body</Box>
      </GeneralDrawer>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.drawer.body)).toBeInTheDocument();
  });

  it("does not render the body when closed", () => {
    const { queryByTestId } = renderWithTheme(
      <GeneralDrawer open={false} onClose={() => {}}>
        <Box data-testid={COMPONENT_TEST_IDS.molecules.drawer.body}>drawer body</Box>
      </GeneralDrawer>,
    );
    expect(queryByTestId(COMPONENT_TEST_IDS.molecules.drawer.body)).toBeNull();
  });
});

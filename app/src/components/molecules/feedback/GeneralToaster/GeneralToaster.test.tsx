import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralToaster from "@/components/molecules/feedback/GeneralToaster";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralToaster", () => {
  it("mounts inside its wrapper without crashing", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.toaster.wrap}>
        <GeneralToaster />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.molecules.toaster.wrap)).toBeInTheDocument();
  });
});

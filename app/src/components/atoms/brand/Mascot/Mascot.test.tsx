import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import Mascot from "@/components/atoms/brand/Mascot";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("Mascot", () => {
  it("renders an svg inside its wrapper", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.mascot.wrap}>
        <Mascot variant="shrugging" />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.mascot.wrap).querySelector("svg")).not.toBeNull();
  });
});

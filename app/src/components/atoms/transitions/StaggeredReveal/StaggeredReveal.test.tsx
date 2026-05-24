import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import StaggeredReveal from "@/components/atoms/transitions/StaggeredReveal";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("StaggeredReveal", () => {
  it("wraps each child with a stagger-index attribute", () => {
    const { getByTestId, container } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.staggeredReveal.wrap}>
        <StaggeredReveal>
          <Box data-testid={COMPONENT_TEST_IDS.atoms.staggeredReveal.itemA}>a</Box>
          <Box data-testid={COMPONENT_TEST_IDS.atoms.staggeredReveal.itemB}>b</Box>
          <Box data-testid={COMPONENT_TEST_IDS.atoms.staggeredReveal.itemC}>c</Box>
        </StaggeredReveal>
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.staggeredReveal.wrap)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.staggeredReveal.itemA)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.staggeredReveal.itemB)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.staggeredReveal.itemC)).toBeInTheDocument();
    expect(container.querySelectorAll("[data-stagger-index]").length).toBe(3);
  });
});

import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import PageTransition from "@/components/atoms/transitions/PageTransition";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("PageTransition", () => {
  it("renders its children", () => {
    const { getByTestId } = renderWithProviders(
      <PageTransition>
        <Box data-testid={COMPONENT_TEST_IDS.atoms.pageTransition.body}>page body</Box>
      </PageTransition>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.pageTransition.body)).toBeInTheDocument();
  });
});

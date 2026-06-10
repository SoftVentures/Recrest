import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralTooltip", () => {
  it("renders the child trigger", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralTooltip title="hi">
        <Box component="span" data-testid={COMPONENT_TEST_IDS.atoms.tooltip.trigger}>
          trigger
        </Box>
      </GeneralTooltip>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.tooltip.trigger)).toBeInTheDocument();
  });
});

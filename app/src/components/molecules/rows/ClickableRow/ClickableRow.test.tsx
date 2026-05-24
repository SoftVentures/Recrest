import { Box } from "@mui/material";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ClickableRow from "@/components/molecules/rows/ClickableRow";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("ClickableRow", () => {
  it("fires onClick when the row is clicked", () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(
      <ClickableRow data-testid={COMPONENT_TEST_IDS.atoms.button.root} onClick={onClick}>
        <Box component="span">row</Box>
      </ClickableRow>,
    );
    fireEvent.click(getByTestId(COMPONENT_TEST_IDS.atoms.button.root));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

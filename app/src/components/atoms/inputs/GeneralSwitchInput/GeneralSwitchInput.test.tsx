import { Box } from "@mui/material";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralSwitchInput", () => {
  it("emits onCheckedChange when toggled", () => {
    const onCheckedChange = vi.fn();
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.switchInput.root}>
        <GeneralSwitchInput onCheckedChange={onCheckedChange} />
      </Box>,
    );
    const input = getByTestId(COMPONENT_TEST_IDS.atoms.switchInput.root).querySelector("input");
    if (input) fireEvent.click(input);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });
});

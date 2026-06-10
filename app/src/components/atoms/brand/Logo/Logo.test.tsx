import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import Logo from "@/components/atoms/brand/Logo";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("Logo", () => {
  it("mounts inside its wrapper", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.logo.wrap}>
        <Logo />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.atoms.logo.wrap);
    expect(wrap.querySelector("svg")).not.toBeNull();
  });
});

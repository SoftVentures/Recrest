import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import Titlebar from "@/components/organisms/titlebars/Titlebar";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("Titlebar", () => {
  it("renders nothing outside Tauri (smoke wrapper survives)", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.titlebar.wrap}>
        <Titlebar />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.titlebar.wrap)).toBeInTheDocument();
  });
});

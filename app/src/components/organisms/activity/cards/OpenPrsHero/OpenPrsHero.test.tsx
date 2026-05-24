import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import OpenPrsHero from "@/components/organisms/activity/cards/OpenPrsHero";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("OpenPrsHero", () => {
  it("renders without crashing inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <OpenPrsHero prsByRepo={{}} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});

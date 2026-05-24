import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import CiHealthHero from "@/components/organisms/activity/cards/CiHealthHero";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("CiHealthHero", () => {
  it("renders without crashing inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <CiHealthHero summaries={[]} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});

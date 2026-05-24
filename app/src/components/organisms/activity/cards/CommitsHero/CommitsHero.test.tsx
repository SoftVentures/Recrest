import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import CommitsHero from "@/components/organisms/activity/cards/CommitsHero";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("CommitsHero", () => {
  it("renders without crashing inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <CommitsHero commits={{ current: 0, previous: 0, delta: 0 }} sparkline={[]} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});

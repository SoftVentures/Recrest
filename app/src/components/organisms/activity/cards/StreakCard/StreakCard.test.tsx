import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import StreakCard from "@/components/organisms/activity/cards/StreakCard";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("StreakCard", () => {
  it("renders without crashing inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <StreakCard streak={0} longest={0} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});

import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import AuthorsHero from "@/components/organisms/activity/cards/AuthorsHero";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithProviders } from "@/test/utils";

describe("AuthorsHero", () => {
  it("renders without crashing inside its wrapper", () => {
    const { getByTestId } = renderWithProviders(
      <Box data-testid={COMPONENT_TEST_IDS.organisms.activityCard.wrap}>
        <AuthorsHero authors={{ current: 0, previous: 0, delta: 0 }} topAuthors={[]} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.organisms.activityCard.wrap).firstChild).not.toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import BusiestPeakCard from "@/components/organisms/activity/cards/BusiestPeakCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("BusiestPeakCard", () => {
  it("renders the busiest-peak card root", () => {
    const { getByTestId } = renderWithProviders(
      <BusiestPeakCard
        stats={{
          commits: { current: 0, previous: 0, delta: 0 },
          authors: { current: 0, previous: 0, delta: 0 },
          repos: { current: 0, previous: 0, delta: 0 },
          currentStreak: 0,
          longestStreak: 0,
          busiestDay: null,
          peakHour: null,
          quietestRepos: [],
        }}
      />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.busiestPeak)).toBeInTheDocument();
  });
});

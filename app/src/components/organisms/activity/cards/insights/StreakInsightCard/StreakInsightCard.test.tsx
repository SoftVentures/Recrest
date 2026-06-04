import { describe, expect, it } from "vitest";

import StreakInsightCard from "@/components/organisms/activity/cards/insights/StreakInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("StreakInsightCard", () => {
  it("renders the streak insight card root", () => {
    const { getByTestId } = renderWithProviders(
      <StreakInsightCard
        streaks={{
          current: 3,
          longest: 5,
          longestRange: { start: "2024-01-01", end: "2024-01-05" },
        }}
      />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.insights.streak)).toBeInTheDocument();
  });
});

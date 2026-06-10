import { describe, expect, it } from "vitest";

import LongestGapInsightCard from "@/components/organisms/activity/cards/insights/LongestGapInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("LongestGapInsightCard", () => {
  it("renders the longest-gap insight card root", () => {
    const { getByTestId } = renderWithProviders(
      <LongestGapInsightCard gap={{ startDate: "2024-01-02", endDate: "2024-01-09", days: 8 }} />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.insights.longestGap)).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import AvgPerWeekInsightCard from "@/components/organisms/activity/cards/insights/AvgPerWeekInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("AvgPerWeekInsightCard", () => {
  it("renders the avg-per-week insight card with a fixed-point value", () => {
    const { getByTestId } = renderWithProviders(<AvgPerWeekInsightCard avg={12.34} />);
    const root = getByTestId(TEST_IDS.activity.cards.insights.avgPerWeek);
    expect(root).toBeInTheDocument();
    expect(root).toHaveTextContent("12.3");
  });
});

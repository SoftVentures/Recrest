import { describe, expect, it } from "vitest";

import TrendInsightCard from "@/components/organisms/activity/cards/insights/TrendInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("TrendInsightCard", () => {
  it("renders the trend insight card with delta percentage", () => {
    const { getByTestId } = renderWithProviders(
      <TrendInsightCard trend={{ direction: "up", deltaPct: 42 }} periodDays={30} />,
    );
    const root = getByTestId(TEST_IDS.activity.cards.insights.trend);
    expect(root).toBeInTheDocument();
    expect(root).toHaveTextContent("42%");
  });
});

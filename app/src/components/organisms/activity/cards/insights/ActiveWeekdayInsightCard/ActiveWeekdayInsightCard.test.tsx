import { describe, expect, it } from "vitest";

import ActiveWeekdayInsightCard from "@/components/organisms/activity/cards/insights/ActiveWeekdayInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ActiveWeekdayInsightCard", () => {
  it("renders the active-weekday insight card root", () => {
    const { getByTestId } = renderWithProviders(
      <ActiveWeekdayInsightCard weekday={{ day: 1, count: 12 }} />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.insights.activeWeekday)).toBeInTheDocument();
  });
});

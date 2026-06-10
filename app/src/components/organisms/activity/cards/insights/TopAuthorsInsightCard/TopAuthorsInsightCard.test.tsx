import { describe, expect, it } from "vitest";

import TopAuthorsInsightCard from "@/components/organisms/activity/cards/insights/TopAuthorsInsightCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("TopAuthorsInsightCard", () => {
  it("renders the top-authors insight card with an author", () => {
    const { getByTestId } = renderWithProviders(
      <TopAuthorsInsightCard
        authors={[{ author: "Ada", email: "ada@example.com", count: 7 }]}
        periodDays={30}
      />,
    );
    const root = getByTestId(TEST_IDS.activity.cards.insights.topAuthors);
    expect(root).toBeInTheDocument();
    expect(root).toHaveTextContent("Ada");
  });
});

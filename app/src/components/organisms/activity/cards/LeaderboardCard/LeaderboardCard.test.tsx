import { describe, expect, it } from "vitest";

import LeaderboardCard from "@/components/organisms/activity/cards/LeaderboardCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("LeaderboardCard", () => {
  it("renders the leaderboard card root", () => {
    const { getByTestId } = renderWithProviders(<LeaderboardCard buckets={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.leaderboard)).toBeInTheDocument();
  });
});

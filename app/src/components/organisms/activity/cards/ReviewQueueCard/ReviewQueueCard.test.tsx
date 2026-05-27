import { describe, expect, it } from "vitest";

import ReviewQueueCard from "@/components/organisms/activity/cards/ReviewQueueCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ReviewQueueCard", () => {
  it("renders the review queue card root and shows the empty placeholder", () => {
    const { getByTestId } = renderWithProviders(<ReviewQueueCard entries={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.reviewQueue)).toBeInTheDocument();
    expect(getByTestId(TEST_IDS.activity.cards.reviewQueueEmpty)).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import PrVelocityCard from "@/components/organisms/activity/cards/PrVelocityCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("PrVelocityCard", () => {
  it("renders the PR-velocity card root", () => {
    const { getByTestId } = renderWithProviders(<PrVelocityCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.prVelocity)).toBeInTheDocument();
  });
});

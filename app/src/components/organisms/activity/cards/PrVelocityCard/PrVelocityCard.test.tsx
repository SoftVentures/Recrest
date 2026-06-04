import { describe, expect, it } from "vitest";

import PrVelocityCard from "@/components/organisms/activity/cards/PrVelocityCard";
import type { VelocityDay } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

function makeRows(count: number): VelocityDay[] {
  return Array.from({ length: count }, (_, day) => ({ day, opened: 1, merged: 1 }));
}

describe("PrVelocityCard", () => {
  it("renders the PR-velocity card root", () => {
    const { getByTestId } = renderWithProviders(<PrVelocityCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.prVelocity)).toBeInTheDocument();
  });

  it("renders a wide window without per-day explosion", () => {
    const { getByTestId } = renderWithProviders(
      <PrVelocityCard rows={makeRows(365)} windowDays={365} />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.prVelocity)).toBeInTheDocument();
  });
});

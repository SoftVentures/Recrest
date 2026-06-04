import { describe, expect, it } from "vitest";

import CiPassRateCard from "@/components/organisms/activity/cards/CiPassRateCard";
import type { PassRateDay } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

function makeRows(count: number): PassRateDay[] {
  return Array.from({ length: count }, (_, day) => ({
    day,
    passed: 9,
    total: 10,
    rate: 0.9,
  }));
}

describe("CiPassRateCard", () => {
  it("renders the CI pass-rate card root", () => {
    const { getByTestId } = renderWithProviders(<CiPassRateCard rows={[]} />);
    expect(getByTestId(TEST_IDS.activity.cards.ciPassRate)).toBeInTheDocument();
  });

  it("renders a wide window without per-day explosion", () => {
    const { getByTestId } = renderWithProviders(
      <CiPassRateCard rows={makeRows(365)} windowDays={365} />,
    );
    expect(getByTestId(TEST_IDS.activity.cards.ciPassRate)).toBeInTheDocument();
  });
});

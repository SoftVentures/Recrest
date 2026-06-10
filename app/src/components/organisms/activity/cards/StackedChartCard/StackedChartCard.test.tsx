import { describe, expect, it } from "vitest";

import StackedChartCard from "@/components/organisms/activity/cards/StackedChartCard";
import type { StackedDay } from "@/lib/activityStats";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

function makeDays(count: number): StackedDay[] {
  return Array.from({ length: count }, (_, day) => ({
    day,
    total: 1,
    segments: [{ repoId: "r1", repoName: "alpha", count: 1, color: "#6366f1" }],
  }));
}

describe("StackedChartCard", () => {
  it("renders the stacked card root", () => {
    const { getByTestId } = renderWithProviders(
      <StackedChartCard stacked={[]} total={0} windowDays={14} />,
    );
    expect(getByTestId(TEST_IDS.activity.stacked.card)).toBeInTheDocument();
  });

  it("renders a wide window without per-day explosion", () => {
    const { getByTestId } = renderWithProviders(
      <StackedChartCard stacked={makeDays(730)} total={730} windowDays={730} />,
    );
    expect(getByTestId(TEST_IDS.activity.stacked.chart)).toBeInTheDocument();
  });
});

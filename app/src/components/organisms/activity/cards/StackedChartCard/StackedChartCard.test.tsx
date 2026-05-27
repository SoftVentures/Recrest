import { describe, expect, it } from "vitest";

import StackedChartCard from "@/components/organisms/activity/cards/StackedChartCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("StackedChartCard", () => {
  it("renders the stacked card root", () => {
    const { getByTestId } = renderWithProviders(<StackedChartCard stacked={[]} total={0} />);
    expect(getByTestId(TEST_IDS.activity.stacked.card)).toBeInTheDocument();
  });
});

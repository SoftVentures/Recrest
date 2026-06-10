import { describe, expect, it } from "vitest";

import ChartTooltip from "@/components/organisms/activity/cards/parts/ChartTooltip";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ChartTooltip", () => {
  it("renders the tooltip container", () => {
    const { getByTestId } = renderWithProviders(
      <ChartTooltip title="12 Mar" rows={[{ color: "#6366f1", label: "alpha", value: "3" }]} />,
    );
    expect(getByTestId(TEST_IDS.activity.chartTooltip)).toBeInTheDocument();
  });
});

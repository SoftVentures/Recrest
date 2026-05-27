import { describe, expect, it } from "vitest";

import HeatmapCard from "@/components/organisms/activity/cards/HeatmapCard";
import type { HeatmapMatrix } from "@/lib/activityAggregates";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("HeatmapCard", () => {
  it("renders the heatmap card root", () => {
    const matrix: HeatmapMatrix = Array.from({ length: 7 }, () =>
      Array(24).fill(0),
    ) as HeatmapMatrix;
    const { getByTestId } = renderWithProviders(<HeatmapCard matrix={matrix} />);
    expect(getByTestId(TEST_IDS.activity.heatmap.card)).toBeInTheDocument();
  });
});

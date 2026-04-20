import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { StackedChartCard } from "@/components/organisms/activity/cards/StackedChartCard";
import "@/i18n";
import { colorForRepo } from "@/lib/activityStats";

describe("StackedChartCard", () => {
  it("renders 14 columns for the 14-day window", () => {
    const stacked = Array.from({ length: 14 }, (_, day) => ({
      day,
      total: day % 3,
      segments: [
        {
          repoId: "r1",
          repoName: "r1",
          count: day % 3,
          color: colorForRepo("r1"),
        },
      ],
    }));
    const { container } = render(
      <TooltipProvider>
        <StackedChartCard stacked={stacked} total={42} />
      </TooltipProvider>,
    );
    expect(container.querySelectorAll(".a-act-chart-col")).toHaveLength(14);
  });
});

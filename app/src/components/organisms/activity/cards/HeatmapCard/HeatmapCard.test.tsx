import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import { HeatmapCard } from "@/components/organisms/activity/cards/HeatmapCard";
import "@/i18n";

describe("HeatmapCard", () => {
  it("renders 7 × 24 = 168 cells", () => {
    const matrix = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
    const { container } = render(
      <TooltipProvider>
        <HeatmapCard matrix={matrix} />
      </TooltipProvider>,
    );
    expect(container.querySelectorAll(".a-act-heatmap-cell")).toHaveLength(168);
  });
});

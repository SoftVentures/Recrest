import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimeToMergeCard } from "@/components/organisms/activity/cards/TimeToMergeCard";
import "@/i18n";

describe("TimeToMergeCard", () => {
  it("renders one row per bucket", () => {
    render(
      <TimeToMergeCard
        buckets={[
          { bucket: "<1h", count: 2 },
          { bucket: "<1d", count: 5 },
          { bucket: "<3d", count: 1 },
          { bucket: ">=3d", count: 0 },
        ]}
      />,
    );
    expect(screen.getByText("<1h")).toBeInTheDocument();
    expect(screen.getByText("≥3d")).toBeInTheDocument();
  });
});

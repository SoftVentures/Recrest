import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TimelineEventsSkeleton } from "@/components/molecules/skeletons/TimelineEventsSkeleton";

describe("TimelineEventsSkeleton", () => {
  it("rendert Default: 4 Events à 3 Platzhalter = 12", () => {
    const { container } = render(<TimelineEventsSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(12);
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<TimelineEventsSkeleton rows={2} />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });
});

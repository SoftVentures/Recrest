import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiSkeleton } from "@/components/molecules/skeletons/KpiSkeleton";

describe("KpiSkeleton", () => {
  it("rendert drei Platzhalter (Label, Wert, Hint)", () => {
    const { container } = render(<KpiSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(3);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<KpiSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});

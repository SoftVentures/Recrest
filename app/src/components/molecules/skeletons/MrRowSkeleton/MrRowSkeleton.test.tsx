import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MrRowSkeleton } from "@/components/molecules/skeletons/MrRowSkeleton";

describe("MrRowSkeleton", () => {
  it("rendert sieben Platzhalter-Elemente", () => {
    const { container } = render(<MrRowSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(7);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<MrRowSkeleton />);
    expect(container.querySelector(".a-mr-row")).toHaveAttribute("aria-hidden");
  });
});

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MrListSkeleton } from "@/components/molecules/skeletons/MrListSkeleton";

describe("MrListSkeleton", () => {
  it("rendert Default: 5 Zeilen à 7 Platzhalter = 35", () => {
    const { container } = render(<MrListSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(35);
  });

  it("rendert die angefragte Anzahl Zeilen", () => {
    const { container } = render(<MrListSkeleton rows={2} />);
    expect(container.querySelectorAll(".a-mr-row")).toHaveLength(2);
  });
});

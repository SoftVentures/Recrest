import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardBlockSkeleton } from "@/components/molecules/skeletons/CardBlockSkeleton";

describe("CardBlockSkeleton", () => {
  it("rendert standardmäßig Titel (2) und 3 Rows (je 3 Platzhalter) = 11", () => {
    const { container } = render(<CardBlockSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(11);
  });

  it("rendert die angefragte Zeilenzahl", () => {
    const { container } = render(<CardBlockSkeleton rows={5} title={false} />);
    // 5 rows * 3 placeholders each = 15
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(15);
  });

  it("blendet den Titel-Block aus, wenn title=false", () => {
    const { container } = render(<CardBlockSkeleton title={false} />);
    expect(container.querySelector(".a-dash-card-h")).toBeNull();
  });
});

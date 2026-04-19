import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { FileChangesSkeleton } from "@/components/molecules/skeletons/FileChangesSkeleton";

describe("FileChangesSkeleton", () => {
  it("rendert Default-Anzahl Zeilen (4 * 2 = 8 Platzhalter)", () => {
    const { container } = render(<FileChangesSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("respektiert die rows-Prop", () => {
    const { container } = render(<FileChangesSkeleton rows={3} />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });
});

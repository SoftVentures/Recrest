import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommitRowSkeleton } from "@/components/molecules/skeletons/CommitRowSkeleton";

describe("CommitRowSkeleton", () => {
  it("rendert vier Platzhalter-Elemente", () => {
    const { container } = render(<CommitRowSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(5);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<CommitRowSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});

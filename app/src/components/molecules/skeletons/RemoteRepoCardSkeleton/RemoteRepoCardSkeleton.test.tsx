import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RemoteRepoCardSkeleton } from "@/components/molecules/skeletons/RemoteRepoCardSkeleton";

describe("RemoteRepoCardSkeleton", () => {
  it("rendert sechs Platzhalter-Elemente", () => {
    const { container } = render(<RemoteRepoCardSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });

  it("ist für Screenreader ausgeblendet", () => {
    const { container } = render(<RemoteRepoCardSkeleton />);
    expect(container.firstElementChild).toHaveAttribute("aria-hidden");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StreakCard } from "@/components/organisms/activity/cards/StreakCard";
import "@/i18n";

describe("StreakCard", () => {
  it("shows the current streak count", () => {
    render(<StreakCard streak={5} longest={12} />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("marks the tile as hot when streak is 3+", () => {
    const { container } = render(<StreakCard streak={4} longest={4} />);
    expect(container.querySelector(".a-act-streak.hot")).not.toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CommitsHero } from "@/components/organisms/activity/cards/CommitsHero";
import "@/i18n";

describe("CommitsHero", () => {
  it("shows the current-week commit count", () => {
    render(
      <CommitsHero
        commits={{ current: 42, previous: 30, delta: 12 }}
        sparkline={[1, 2, 3, 4, 5, 6, 7]}
      />,
    );
    expect(screen.getByText("42")).toBeInTheDocument();
  });
});

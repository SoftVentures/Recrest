import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OpenPrsHero } from "@/components/organisms/activity/cards/OpenPrsHero";
import { fakePr } from "@/components/organisms/activity/cards/_fixtures";
import "@/i18n";

describe("OpenPrsHero", () => {
  it("counts open PRs across all repos", () => {
    render(
      <OpenPrsHero
        prsByRepo={{
          r1: [fakePr({ id: "1", number: 1 }), fakePr({ id: "2", number: 2 })],
          r2: [fakePr({ id: "3", number: 3 })],
        }}
      />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("renders zero when there are no open PRs", () => {
    render(<OpenPrsHero prsByRepo={{}} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });
});

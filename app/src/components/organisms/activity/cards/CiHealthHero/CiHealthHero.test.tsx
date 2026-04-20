import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CiHealthHero } from "@/components/organisms/activity/cards/CiHealthHero";
import { fakeCheckRun } from "@/components/organisms/activity/cards/_fixtures";
import "@/i18n";

describe("CiHealthHero", () => {
  it("renders a percentage from summaries", () => {
    render(<CiHealthHero summaries={[fakeCheckRun({ total: 10, passed: 9, failed: 1 })]} />);
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("renders an em-dash when no runs exist", () => {
    render(<CiHealthHero summaries={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

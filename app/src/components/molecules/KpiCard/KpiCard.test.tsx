import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { KpiCard } from "@/components/molecules/KpiCard";

describe("KpiCard", () => {
  it("rendert Label und Value", () => {
    render(<KpiCard label="Repos" value={42} />);
    expect(screen.getByText("Repos")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("zeigt den optionalen Hint an", () => {
    render(<KpiCard label="Open PRs" value="5" hint="+2 diese Woche" />);
    expect(screen.getByText("+2 diese Woche")).toBeInTheDocument();
  });

  it("rendert keinen Hint, wenn keiner übergeben wurde", () => {
    render(<KpiCard label="X" value="1" />);
    expect(screen.queryByText(/diese Woche/)).toBeNull();
  });
});

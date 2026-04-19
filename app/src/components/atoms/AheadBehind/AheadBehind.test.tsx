import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AheadBehind } from "@/components/atoms/AheadBehind";

describe("AheadBehind", () => {
  it("rendert ohne Crash bei leerem Stand", () => {
    const { container } = render(<AheadBehind ahead={0} behind={0} />);
    expect(container.textContent).toContain("↕ 0");
  });

  it("gibt im compact Mode bei gleichem Stand null zurück", () => {
    const { container } = render(<AheadBehind ahead={0} behind={0} compact />);
    expect(container.firstChild).toBeNull();
  });

  it("zeigt ahead-Zahl mit Aufwärtspfeil", () => {
    render(<AheadBehind ahead={3} behind={0} />);
    expect(screen.getByText("↑3")).toBeInTheDocument();
  });

  it("zeigt behind-Zahl mit Abwärtspfeil", () => {
    render(<AheadBehind ahead={0} behind={5} />);
    expect(screen.getByText("↓5")).toBeInTheDocument();
  });

  it("zeigt beide Zahlen wenn divergent", () => {
    render(<AheadBehind ahead={2} behind={4} />);
    expect(screen.getByText("↑2")).toBeInTheDocument();
    expect(screen.getByText("↓4")).toBeInTheDocument();
  });
});

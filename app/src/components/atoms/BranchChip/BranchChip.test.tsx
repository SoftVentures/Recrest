import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { BranchChip } from "@/components/atoms/BranchChip";

describe("BranchChip", () => {
  it("rendert Branch-Namen", () => {
    render(<BranchChip branch="feature/login" />);
    expect(screen.getByText("feature/login")).toBeInTheDocument();
  });

  it("hat keine Größenklasse bei md (default)", () => {
    const { container } = render(<BranchChip branch="main" />);
    const chip = container.querySelector(".a-branch-chip");
    expect(chip?.className).toBe("a-branch-chip");
  });

  it("fügt sm-Klasse bei size='sm' hinzu", () => {
    const { container } = render(<BranchChip branch="dev" size="sm" />);
    expect(container.querySelector(".a-branch-chip.sm")).not.toBeNull();
  });

  it("fügt big-Klasse bei size='big' hinzu", () => {
    const { container } = render(<BranchChip branch="dev" size="big" />);
    expect(container.querySelector(".a-branch-chip.big")).not.toBeNull();
  });

  it("rendert ein SVG-Icon neben dem Namen", () => {
    const { container } = render(<BranchChip branch="main" />);
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KpiTile } from "@/components/molecules/KpiTile";

describe("KpiTile", () => {
  it("rendert als div ohne onClick", () => {
    render(<KpiTile label="Repos" value={3} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Repos")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("rendert als Button und ruft onClick auf", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(<KpiTile label="PRs" value={5} onClick={onClick} />);
    const btn = screen.getByRole("button");
    expect(btn).toHaveAttribute("data-clickable", "true");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("zeigt den optionalen Sub-Text", () => {
    render(<KpiTile label="x" value="1" sub="letzte 7 Tage" />);
    expect(screen.getByText("letzte 7 Tage")).toBeInTheDocument();
  });
});

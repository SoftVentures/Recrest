import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MrChip } from "@/components/molecules/MrChip";

describe("MrChip", () => {
  it("rendert Label", () => {
    render(<MrChip>Open</MrChip>);
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
  });

  it("zeigt den Counter, wenn > 0", () => {
    render(<MrChip count={4}>Open</MrChip>);
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("versteckt den Counter bei 0", () => {
    render(<MrChip count={0}>Open</MrChip>);
    expect(screen.queryByText("0")).toBeNull();
  });

  it("setzt active-Klasse und ruft onClick", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <MrChip active onClick={onClick}>
        x
      </MrChip>,
    );
    const btn = screen.getByRole("button");
    expect(btn.className).toContain("active");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

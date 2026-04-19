import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Switch } from "@/components/atoms/Switch";

describe("Switch", () => {
  it("rendert mit role=switch", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("ist per Default unchecked", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "unchecked");
  });

  it("respektiert defaultChecked", () => {
    render(<Switch defaultChecked />);
    expect(screen.getByRole("switch")).toHaveAttribute("data-state", "checked");
  });

  it("ruft onCheckedChange bei Klick auf", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Switch onCheckedChange={handler} />);
    await user.click(screen.getByRole("switch"));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("ist disabled wenn disabled-Prop gesetzt", () => {
    render(<Switch disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });
});

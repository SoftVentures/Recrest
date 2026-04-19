import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Checkbox } from "@/components/atoms/Checkbox";

describe("Checkbox", () => {
  it("rendert mit role=checkbox", () => {
    render(<Checkbox />);
    expect(screen.getByRole("checkbox")).toBeInTheDocument();
  });

  it("ist ungecheckt per Default", () => {
    render(<Checkbox />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "unchecked");
  });

  it("respektiert defaultChecked", () => {
    render(<Checkbox defaultChecked />);
    expect(screen.getByRole("checkbox")).toHaveAttribute("data-state", "checked");
  });

  it("ruft onCheckedChange bei Klick auf", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Checkbox onCheckedChange={handler} />);
    await user.click(screen.getByRole("checkbox"));
    expect(handler).toHaveBeenCalledWith(true);
  });

  it("ist disabled wenn disabled-Prop gesetzt ist", () => {
    render(<Checkbox disabled />);
    expect(screen.getByRole("checkbox")).toBeDisabled();
  });
});

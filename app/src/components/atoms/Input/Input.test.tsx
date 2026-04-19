import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Input } from "@/components/atoms/Input";

describe("Input", () => {
  it("rendert input mit placeholder", () => {
    render(<Input placeholder="Suchen…" />);
    expect(screen.getByPlaceholderText("Suchen…")).toBeInTheDocument();
  });

  it("ruft onChange bei Eingabe auf", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Input onChange={handler} />);
    await user.type(screen.getByRole("textbox"), "abc");
    expect(handler).toHaveBeenCalled();
  });

  it("setzt aria-invalid wenn invalid=true", () => {
    render(<Input invalid />);
    expect(screen.getByRole("textbox")).toHaveAttribute("aria-invalid", "true");
  });

  it("setzt kein aria-invalid wenn invalid=false", () => {
    render(<Input />);
    expect(screen.getByRole("textbox")).not.toHaveAttribute("aria-invalid");
  });

  it("ist disabled wenn disabled-Prop gesetzt", () => {
    render(<Input disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("leitet ref auf das input-Element weiter", () => {
    const ref = { current: null as HTMLInputElement | null };
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });
});

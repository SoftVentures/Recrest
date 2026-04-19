import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Button } from "@/components/atoms/Button";

describe("Button", () => {
  it("rendert Label", () => {
    render(<Button>Klick mich</Button>);
    expect(screen.getByRole("button", { name: "Klick mich" })).toBeInTheDocument();
  });

  it("wendet die outline-Variante an", () => {
    render(<Button variant="outline">x</Button>);
    expect(screen.getByRole("button").className).toContain("border-input");
  });

  it("ruft onClick bei Klick auf", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button onClick={handler}>ok</Button>);
    await user.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("ist disabled während loading", () => {
    render(<Button loading>loading</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("ruft onClick nicht auf wenn disabled", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      <Button disabled onClick={handler}>
        x
      </Button>,
    );
    await user.click(screen.getByRole("button"));
    expect(handler).not.toHaveBeenCalled();
  });
});

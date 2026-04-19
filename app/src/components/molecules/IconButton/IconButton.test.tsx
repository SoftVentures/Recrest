import type { ReactNode } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { IconButton, IconLink } from "@/components/molecules/IconButton";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

function wrap(node: ReactNode) {
  return <TooltipProvider>{node}</TooltipProvider>;
}

describe("IconButton", () => {
  it("nutzt den Tooltip-Text als aria-label", () => {
    render(wrap(<IconButton tooltip="Schließen">x</IconButton>));
    expect(screen.getByRole("button", { name: "Schließen" })).toBeInTheDocument();
  });

  it("übernimmt ein explizites aria-label", () => {
    render(
      wrap(
        <IconButton tooltip="Tip" aria-label="Explizit">
          x
        </IconButton>,
      ),
    );
    expect(screen.getByRole("button", { name: "Explizit" })).toBeInTheDocument();
  });

  it("ruft onClick bei Klick auf", async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(
      wrap(
        <IconButton tooltip="Klick" onClick={handler}>
          x
        </IconButton>,
      ),
    );
    await user.click(screen.getByRole("button"));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("rendert IconLink mit href", () => {
    render(
      wrap(
        <IconLink tooltip="Extern" href="https://example.com">
          x
        </IconLink>,
      ),
    );
    const link = screen.getByRole("link", { name: "Extern" });
    expect(link).toHaveAttribute("href", "https://example.com");
  });
});

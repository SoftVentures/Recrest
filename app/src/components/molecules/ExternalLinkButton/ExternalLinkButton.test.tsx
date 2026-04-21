import type { ReactElement } from "react";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExternalLinkButton } from "@/components/molecules/ExternalLinkButton";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

function renderWithTooltip(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

describe("ExternalLinkButton", () => {
  it("rendert Label und nutzt es als aria-label-Fallback", () => {
    renderWithTooltip(<ExternalLinkButton url="https://example.com" label="Docs" />);
    const btn = screen.getByTestId("external-link-button");
    expect(btn).toHaveAttribute("aria-label", "Docs");
  });

  it("ruft window.open außerhalb von Tauri auf", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    renderWithTooltip(<ExternalLinkButton url="https://example.com" label="Go" />);
    await user.click(screen.getByTestId("external-link-button"));
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("rendert im iconOnly-Modus kein Label", () => {
    renderWithTooltip(<ExternalLinkButton url="https://example.com" label="Docs" iconOnly />);
    expect(screen.queryByText("Docs")).toBeNull();
  });
});

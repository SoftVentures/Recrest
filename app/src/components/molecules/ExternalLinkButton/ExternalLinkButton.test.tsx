import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ExternalLinkButton } from "@/components/molecules/ExternalLinkButton";

describe("ExternalLinkButton", () => {
  it("rendert Label und nutzt es als title-Fallback", () => {
    render(<ExternalLinkButton url="https://example.com" label="Docs" />);
    const btn = screen.getByRole("button", { name: /Docs/ });
    expect(btn).toHaveAttribute("title", "Docs");
  });

  it("ruft window.open außerhalb von Tauri auf", async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<ExternalLinkButton url="https://example.com" label="Go" />);
    await user.click(screen.getByRole("button"));
    expect(openSpy).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
    openSpy.mockRestore();
  });

  it("rendert im iconOnly-Modus kein Label", () => {
    render(<ExternalLinkButton url="https://example.com" label="Docs" iconOnly />);
    expect(screen.queryByText("Docs")).toBeNull();
  });
});

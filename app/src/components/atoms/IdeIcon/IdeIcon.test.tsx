import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { IdeIcon } from "@/components/atoms/IdeIcon";

/**
 * IDE logos are inlined as SVGs via `vite-plugin-svgr` (`.svg?react`), so
 * they render deterministically in jsdom. Tests cover the Cursor path
 * (inline SVG from `simple-icons`) plus a smoke check that every official
 * IDE id mounts without crashing.
 */
describe("IdeIcon", () => {
  it("renders the Cursor logo inline with the expected aria-label", () => {
    render(<IdeIcon id="cursor" title="Cursor" />);
    expect(screen.getByLabelText("Cursor")).toBeInTheDocument();
  });

  it("applies the custom size to the Cursor SVG", () => {
    const { container } = render(<IdeIcon id="cursor" size={40} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("40");
    expect(svg?.getAttribute("height")).toBe("40");
  });

  it("mounts without crashing for every official IDE id", () => {
    const ids = ["vscode", "vscode-insiders", "webstorm", "idea", "jetbrains-toolbox"] as const;
    for (const id of ids) {
      const { container, unmount } = render(<IdeIcon id={id} />);
      expect(container.firstChild).not.toBeNull();
      unmount();
    }
  });
});

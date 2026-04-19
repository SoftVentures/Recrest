import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Kbd } from "@/components/atoms/Kbd";

describe("Kbd", () => {
  it("rendert children", () => {
    render(<Kbd>Esc</Kbd>);
    expect(screen.getByText("Esc")).toBeInTheDocument();
  });

  it("setzt die kbd-Klasse", () => {
    render(<Kbd>Ctrl</Kbd>);
    expect(screen.getByText("Ctrl")).toHaveClass("kbd");
  });

  it("rendert komplexere ReactNode-Kinder", () => {
    render(
      <Kbd>
        <span data-testid="inner">⌘</span>K
      </Kbd>,
    );
    expect(screen.getByTestId("inner")).toBeInTheDocument();
  });
});

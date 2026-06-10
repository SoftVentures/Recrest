import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Kbd, { KbdSize } from "@/components/atoms/inputs/Kbd";

describe("Kbd", () => {
  it("renders as a <kbd> element by default", () => {
    render(<Kbd>⌘K</Kbd>);
    const el = screen.getByText("⌘K");
    expect(el.tagName).toBe("KBD");
  });

  it("forwards arbitrary attributes through to the root element", () => {
    render(<Kbd aria-label="kbd-x">X</Kbd>);
    expect(screen.getByLabelText("kbd-x")).toHaveTextContent("X");
  });

  it("accepts the MD size variant", () => {
    render(<Kbd size={KbdSize.MD}>X</Kbd>);
    expect(screen.getByText("X").tagName).toBe("KBD");
  });
});

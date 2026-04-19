import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";

describe("AuthorAvatar", () => {
  it("rendert Initialen aus dem Namen", () => {
    render(<AuthorAvatar name="Valentin Röhle" />);
    expect(screen.getByText("VR")).toBeInTheDocument();
  });

  it("nutzt das aria-label mit dem vollen Namen", () => {
    render(<AuthorAvatar name="Alice" />);
    expect(screen.getByLabelText("Alice")).toBeInTheDocument();
  });

  it("fällt auf '?' zurück, wenn kein Name gegeben ist", () => {
    render(<AuthorAvatar name={null} />);
    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("rendert ein Bild, wenn eine src übergeben ist", () => {
    render(<AuthorAvatar name="Bob" src="https://example.com/pic.png" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "https://example.com/pic.png");
    expect(img).toHaveAttribute("alt", "Bob");
  });
});

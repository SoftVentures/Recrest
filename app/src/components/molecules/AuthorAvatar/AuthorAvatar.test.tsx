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
    const { container } = render(<AuthorAvatar name="Bob" src="https://example.com/pic.png" />);
    // The image is presentational now — the surrounding chip carries the
    // aria-label, so we look it up via the DOM rather than by role.
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute("src", "https://example.com/pic.png");
    expect(screen.getByLabelText("Bob")).toBeInTheDocument();
  });

  it("baut eine Gravatar-URL aus einer E-Mail", () => {
    const { container } = render(<AuthorAvatar name="Grav" email="valentin.roehle@benova.eu" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\//);
  });
});

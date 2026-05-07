import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";

describe("AuthorAvatar", () => {
  it("rendert Initialen aus dem Namen", () => {
    render(<AuthorAvatar name="Anna Müller" />);
    expect(screen.getByText("AM")).toBeInTheDocument();
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
    // `@example.com` is suppressed on purpose (dev-seed convention — the
    // domain always 404s on Gravatar so we skip the request entirely).
    // Use a real-looking address here so the Gravatar fallback path runs.
    const { container } = render(<AuthorAvatar name="Grav" email="alice@gmail.com" />);
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\//);
  });

  it("überspringt Gravatar für Dev-Seed-Mails (.example.com)", () => {
    const { container } = render(<AuthorAvatar name="Seed" email="alice@example.com" />);
    expect(container.querySelector("img")).toBeNull();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardShell } from "@/components/organisms/activity/cards/CardShell";

describe("CardShell", () => {
  it("renders title, optional sub, and children", () => {
    render(
      <CardShell title="Hello" sub="world">
        <div>body</div>
      </CardShell>,
    );
    expect(screen.getByText("Hello")).toBeInTheDocument();
    expect(screen.getByText("world")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
});

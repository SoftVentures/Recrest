import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Badge } from "@/components/atoms/Badge";

describe("Badge", () => {
  it("rendert Kind-Inhalt", () => {
    render(<Badge>Neu</Badge>);
    expect(screen.getByText("Neu")).toBeInTheDocument();
  });

  it("nutzt die default-Variante ohne Prop", () => {
    render(<Badge>default</Badge>);
    expect(screen.getByText("default").className).toContain("bg-primary");
  });

  it("wendet die outline-Variante an", () => {
    render(<Badge variant="outline">outline</Badge>);
    expect(screen.getByText("outline").className).toContain("border-border");
  });

  it("wendet die success-Variante an", () => {
    render(<Badge variant="success">ok</Badge>);
    expect(screen.getByText("ok").className).toContain("text-status-success");
  });

  it("merged zusätzliche className", () => {
    render(<Badge className="custom-class">x</Badge>);
    expect(screen.getByText("x").className).toContain("custom-class");
  });
});

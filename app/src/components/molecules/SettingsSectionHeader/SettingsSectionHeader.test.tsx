import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsSectionHeader } from "@/components/molecules/SettingsSectionHeader";

describe("SettingsSectionHeader", () => {
  it("rendert Titel als h2", () => {
    render(<SettingsSectionHeader title="Erscheinungsbild" />);
    expect(screen.getByRole("heading", { level: 2, name: "Erscheinungsbild" })).toBeInTheDocument();
  });

  it("zeigt die Description an", () => {
    render(<SettingsSectionHeader title="T" description="Beschreibungstext" />);
    expect(screen.getByText("Beschreibungstext")).toBeInTheDocument();
  });

  it("rendert ohne Description keinen p-Tag", () => {
    const { container } = render(<SettingsSectionHeader title="T" />);
    expect(container.querySelector("p")).toBeNull();
  });
});

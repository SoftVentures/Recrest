import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsSection } from "@/components/organisms/settings/SettingsSection";

describe("SettingsSection", () => {
  it("renders title, description, and children", () => {
    render(
      <SettingsSection title="Appearance" description="Theme + density">
        <div data-testid="body">rows</div>
      </SettingsSection>,
    );
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Theme + density")).toBeInTheDocument();
    expect(screen.getByTestId("body")).toBeInTheDocument();
  });

  it("omits the description slot when none is provided", () => {
    render(
      <SettingsSection title="X">
        <span />
      </SettingsSection>,
    );
    expect(screen.queryByTestId("settings-section-desc")).toBeNull();
  });
});

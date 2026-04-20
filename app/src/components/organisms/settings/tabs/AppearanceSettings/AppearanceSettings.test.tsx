import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { AppearanceSettings } from "@/components/organisms/settings/tabs/AppearanceSettings";

describe("AppearanceSettings", () => {
  it("renders a theme + font + accent section", () => {
    render(
      <SettingsHarness>
        <AppearanceSettings />
      </SettingsHarness>,
    );
    // Multiple Select triggers expected: theme, font, font size, language…
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(2);
  });
});

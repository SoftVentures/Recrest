import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DesktopSettings } from "@/components/organisms/settings/tabs/DesktopSettings";

describe("DesktopSettings", () => {
  it("renders three switch rows (auto-start, start-minimized, close-to-tray)", () => {
    render(
      <SettingsHarness>
        <DesktopSettings />
      </SettingsHarness>,
    );
    expect(screen.getAllByRole("switch")).toHaveLength(3);
  });
});

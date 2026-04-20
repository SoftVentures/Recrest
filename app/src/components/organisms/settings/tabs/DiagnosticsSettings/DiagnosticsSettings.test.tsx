import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DiagnosticsSettings } from "@/components/organisms/settings/tabs/DiagnosticsSettings";

describe("DiagnosticsSettings", () => {
  it("renders the crash-reporting toggle row", () => {
    render(
      <SettingsHarness>
        <DiagnosticsSettings />
      </SettingsHarness>,
    );
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });
});

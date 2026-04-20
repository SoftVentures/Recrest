import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { SystemSettings } from "@/components/organisms/settings/tabs/SystemSettings";

describe("SystemSettings", () => {
  it("renders at least one select trigger (IDE or polling)", () => {
    render(
      <SettingsHarness>
        <SystemSettings />
      </SettingsHarness>,
    );
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(1);
  });
});

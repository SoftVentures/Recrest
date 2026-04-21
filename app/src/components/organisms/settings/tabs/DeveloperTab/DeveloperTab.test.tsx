import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { DeveloperTab } from "@/components/organisms/settings/tabs/DeveloperTab";

describe("DeveloperTab", () => {
  it("renders all six sections with the expected data-testids", () => {
    render(
      <SettingsHarness>
        <DeveloperTab />
      </SettingsHarness>,
    );

    expect(screen.getByTestId("developer-tab")).toBeInTheDocument();
    for (const id of [
      "dev-section-build",
      "dev-section-updater",
      "dev-section-storage",
      "dev-section-ipc",
      "dev-section-i18n",
      "dev-section-flags",
    ]) {
      expect(screen.getByTestId(id)).toBeInTheDocument();
    }
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { NotificationSettings } from "@/components/organisms/settings/tabs/NotificationSettings";

describe("NotificationSettings", () => {
  it("renders one master toggle plus three sub-toggles", () => {
    render(
      <SettingsHarness>
        <NotificationSettings />
      </SettingsHarness>,
    );
    expect(screen.getAllByRole("switch")).toHaveLength(4);
  });
});

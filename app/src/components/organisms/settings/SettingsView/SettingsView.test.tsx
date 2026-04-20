import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsView } from "@/components/organisms/settings/SettingsView";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

describe("SettingsView", () => {
  it("renders the six tab entries", () => {
    render(
      <SettingsHarness>
        <SettingsView />
      </SettingsHarness>,
    );
    expect(screen.getAllByText(/general/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/accounts/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/about/i).length).toBeGreaterThan(0);
  });
});

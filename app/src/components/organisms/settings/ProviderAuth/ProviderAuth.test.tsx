import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProviderAuth } from "@/components/organisms/settings/ProviderAuth";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

describe("ProviderAuth", () => {
  it("renders one row per supported provider", () => {
    render(
      <SettingsHarness>
        <ProviderAuth />
      </SettingsHarness>,
    );
    expect(screen.getAllByText(/github/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/gitlab/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/bitbucket/i).length).toBeGreaterThan(0);
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { AboutTabBody } from "@/components/organisms/settings/tabs/AboutTab";

describe("AboutTabBody", () => {
  it("renders the Recrest app name", () => {
    render(
      <SettingsHarness>
        <AboutTabBody />
      </SettingsHarness>,
    );
    expect(screen.getAllByText(/recrest/i).length).toBeGreaterThan(0);
  });
});

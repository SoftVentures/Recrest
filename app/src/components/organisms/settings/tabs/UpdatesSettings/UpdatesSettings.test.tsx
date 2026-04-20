import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";
import { UpdatesSettings } from "@/components/organisms/settings/tabs/UpdatesSettings";

describe("UpdatesSettings", () => {
  it("renders the update-mode select + check-now button", () => {
    render(
      <SettingsHarness>
        <UpdatesSettings />
      </SettingsHarness>,
    );
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /check/i })).toBeInTheDocument();
  });
});

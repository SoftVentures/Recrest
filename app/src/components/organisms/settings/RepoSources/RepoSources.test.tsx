import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RepoSources } from "@/components/organisms/settings/RepoSources";
import { SettingsHarness } from "@/components/organisms/settings/_test-helpers";

describe("RepoSources", () => {
  it("exposes an add-path textbox", () => {
    render(
      <SettingsHarness>
        <RepoSources />
      </SettingsHarness>,
    );
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });
});

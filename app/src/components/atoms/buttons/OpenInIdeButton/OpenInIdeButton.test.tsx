import { act, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OpenInIdeButton, { OpenInIdeVariant } from "@/components/atoms/buttons/OpenInIdeButton";
import { SEED_SETTINGS } from "@/lib/dev/seed/settings";
import { loadSettings } from "@/store/actions/settings.actions";
import { renderWithProviders } from "@/test/utils";

describe("OpenInIdeButton", () => {
  it("renders an icon-only trigger by default", () => {
    renderWithProviders(<OpenInIdeButton repoId="r1" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders a labelled button in BUTTON variant", () => {
    renderWithProviders(
      <OpenInIdeButton repoId="r1" variant={OpenInIdeVariant.BUTTON} label="Open in IDE" />,
    );
    expect(screen.getByRole("button", { name: /open in ide/i })).toBeInTheDocument();
  });

  it("reflects the chosen default IDE from settings", () => {
    const { store } = renderWithProviders(
      <OpenInIdeButton repoId="r1" variant={OpenInIdeVariant.BUTTON} />,
    );
    act(() => {
      store.dispatch(
        loadSettings.fulfilled({ ...SEED_SETTINGS, defaultIde: "cursor" }, "req", undefined),
      );
    });
    expect(screen.getByRole("button", { name: /open in cursor/i })).toBeInTheDocument();
  });
});

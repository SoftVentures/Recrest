import type { CustomFont } from "@recrest/shared";

import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { FontsSection } from "@/pages/app/Settings/components/GeneralTab/sections/FontsSection";
import { makeTestStore, renderWithProviders } from "@/test/utils";

const CUSTOM_FONT: CustomFont = {
  id: "my-custom",
  family: "My Custom",
  fileName: "my-custom.woff2",
  format: "woff2",
  data: "",
};

function openSelect(testId: string) {
  // MUI `Select` opens its listbox on mouseDown of the inner combobox. The
  // testid lands on the select root; the combobox is its sole focusable child.
  const root = screen.getByTestId(testId);
  const combobox = root.querySelector('[role="combobox"]') as HTMLElement;
  fireEvent.mouseDown(combobox);
}

describe("FontsSection", () => {
  it("renders the code-font select with the mono options and dispatches a codeFont update", () => {
    const store = makeTestStore();
    renderWithProviders(<FontsSection />, { store });

    openSelect(TEST_IDS.settings.general.codeFontSelect);

    expect(
      screen.getByTestId(TEST_IDS.settings.general.codeFontOption("jetbrains-mono")),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.settings.general.codeFontOption("fira-code")),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.settings.general.codeFontOption("fira-code")));

    expect(store.getState().settings.codeFont).toBe("fira-code");
  });

  it("renders the three ligature modes and dispatches a codeLigatures update", () => {
    const store = makeTestStore();
    renderWithProviders(<FontsSection />, { store });

    openSelect(TEST_IDS.settings.general.codeLigaturesSelect);

    expect(
      screen.getByTestId(TEST_IDS.settings.general.codeLigaturesOption("off")),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.settings.general.codeLigaturesOption("standard")),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.settings.general.codeLigaturesOption("stylistic")),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.settings.general.codeLigaturesOption("off")));

    expect(store.getState().settings.codeLigatures).toBe("off");
  });

  it("renders the UI-font select with sans options that the code-font select omits", () => {
    const store = makeTestStore();
    renderWithProviders(<FontsSection />, { store });

    openSelect(TEST_IDS.settings.general.fontSelect);

    expect(screen.getByTestId(TEST_IDS.settings.general.fontOption("inter"))).toBeInTheDocument();
    expect(
      screen.queryByTestId(TEST_IDS.settings.general.codeFontOption("inter")),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId(TEST_IDS.settings.general.fontOption("manrope")));

    expect(store.getState().settings.font).toBe("manrope");
  });

  it("disables the custom-font upload button outside the Tauri runtime", () => {
    const store = makeTestStore();
    renderWithProviders(<FontsSection />, { store });

    expect(screen.getByTestId(TEST_IDS.settings.general.customFontUpload)).toBeDisabled();
  });

  it("renders uploaded custom fonts with a chip and a delete affordance", () => {
    const store = makeTestStore({ settings: { customFonts: [CUSTOM_FONT] } });
    renderWithProviders(<FontsSection />, { store });

    expect(
      screen.getByTestId(TEST_IDS.settings.general.customFontChip(CUSTOM_FONT.id)),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId(TEST_IDS.settings.general.customFontDelete(CUSTOM_FONT.id)),
    ).toBeInTheDocument();
  });
});

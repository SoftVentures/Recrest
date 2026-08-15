import { Box } from "@mui/material";

import type { FontSizeId } from "@recrest/shared";

import { afterEach, describe, expect, it, vi } from "vitest";

import { makeTestStore, renderWithProviders } from "@/test/utils";
import { ThemeWrapper } from "@/theme/ThemeWrapper";

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
  vi.restoreAllMocks();
});

describe("ThemeWrapper", () => {
  it("mirrors the font + accessibility settings onto the document root", () => {
    renderWithProviders(
      <ThemeWrapper>
        <Box />
      </ThemeWrapper>,
    );
    const root = document.documentElement;
    expect(root.dataset.font).toBeTruthy();
    expect(root.dataset.codeFont).toBeTruthy();
    expect(root.dataset.highContrast).toBe("false");
    expect(root.dataset.reducedMotion).toBe("false");
    expect(root.dataset.underlineLinks).toBe("false");
    expect(document.body.style.fontFamily).not.toBe("");
  });

  it("writes --ui-scale from settings.uiScale, clamped to the supported range", () => {
    const cases: ReadonlyArray<[number, string]> = [
      [0.8, "0.8"],
      [1, "1"],
      [1.25, "1.25"],
      [1.5, "1.5"],
      // Out of range in both directions — clamped, never written raw.
      [0.1, "0.8"],
      [4, "1.5"],
    ];
    for (const [uiScale, expected] of cases) {
      const { unmount } = renderWithProviders(
        <ThemeWrapper>
          <Box />
        </ThemeWrapper>,
        { store: makeTestStore({ settings: { uiScale } }) },
      );
      expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe(expected);
      unmount();
    }
  });

  it("keeps font size text-only — it moves the body size, not --ui-scale", () => {
    const cases: ReadonlyArray<[FontSizeId, string]> = [
      ["sm", "0.75rem"],
      ["md", "0.8125rem"],
      ["lg", "0.9375rem"],
      ["xl", "1.0625rem"],
    ];
    for (const [fontSize, expected] of cases) {
      const { unmount } = renderWithProviders(
        <ThemeWrapper>
          <Box />
        </ThemeWrapper>,
        { store: makeTestStore({ settings: { fontSize } }) },
      );
      expect(document.body.style.fontSize).toBe(expected);
      expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe("1");
      unmount();
    }
  });

  it("writes --text-scale so `fontPxToRem` values follow the font-size setting", () => {
    const cases: ReadonlyArray<[FontSizeId, string]> = [
      ["sm", String(12 / 13)],
      ["md", "1"],
      ["lg", String(15 / 13)],
      ["xl", String(17 / 13)],
    ];
    for (const [fontSize, expected] of cases) {
      const { unmount } = renderWithProviders(
        <ThemeWrapper>
          <Box />
        </ThemeWrapper>,
        { store: makeTestStore({ settings: { fontSize } }) },
      );
      expect(document.documentElement.style.getPropertyValue("--text-scale")).toBe(expected);
      unmount();
    }
  });

  it("subscribes to the OS appearance query when followsSystem is on", () => {
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener,
      removeEventListener,
    }) as unknown as typeof window.matchMedia;

    renderWithProviders(
      <ThemeWrapper>
        <Box />
      </ThemeWrapper>,
      { store: makeTestStore({ settings: { followsSystem: true } }) },
    );

    expect(window.matchMedia).toHaveBeenCalledWith("(prefers-color-scheme: dark)");
    expect(addEventListener).toHaveBeenCalledWith("change", expect.any(Function));
  });

  it("does not touch the OS appearance query when followsSystem is off", () => {
    window.matchMedia = vi.fn() as unknown as typeof window.matchMedia;

    renderWithProviders(
      <ThemeWrapper>
        <Box />
      </ThemeWrapper>,
      { store: makeTestStore({ settings: { followsSystem: false } }) },
    );

    expect(window.matchMedia).not.toHaveBeenCalled();
  });
});

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

  it("writes the matching ui-scale custom property for each interface size", () => {
    const cases: ReadonlyArray<[FontSizeId, string]> = [
      ["sm", "0.94"],
      ["md", "1"],
      ["lg", "1.12"],
      ["xl", "1.25"],
    ];
    for (const [fontSize, scale] of cases) {
      const { unmount } = renderWithProviders(
        <ThemeWrapper>
          <Box />
        </ThemeWrapper>,
        { store: makeTestStore({ settings: { fontSize } }) },
      );
      expect(document.documentElement.style.getPropertyValue("--ui-scale")).toBe(scale);
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

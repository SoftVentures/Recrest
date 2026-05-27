import { describe, expect, it } from "vitest";

import { THEMES } from "@/lib/constants/theme.constants";
import { getTheme } from "@/theme";

describe("getTheme", () => {
  it.each(THEMES.map((t) => [t.id, t.label] as const))("builds a complete palette for %s", (id) => {
    const theme = getTheme(id);
    expect(theme.palette.primary.main).toMatch(/^#|^rgb/);
    expect(theme.palette.surface.button.primary).toBeDefined();
    expect(theme.palette.surface.interface.base).toBeDefined();
    expect(theme.palette.formatting.code.inlineText).toBeDefined();
    expect(theme.effects.backdropBlur).toBeDefined();
    expect(theme.palette.icon.primary).toBeDefined();
    expect(theme.palette.border.default).toBeDefined();
  });

  it("Glassy uses transparent background + backdrop blur", () => {
    const theme = getTheme("glassy");
    expect(theme.palette.background.default).toBe("transparent");
    expect(theme.effects.backdropBlur).toContain("blur(");
    expect(theme.effects.backdropSaturate).toBe("180%");
  });

  it("OLED uses pure black background", () => {
    const theme = getTheme("oled");
    expect(theme.palette.background.default).toBe("#000000");
    // Surfaces still pure-black; mode remains "dark" so MUI's dark-mode component logic kicks in.
    expect(theme.palette.mode).toBe("dark");
  });

  it("Light keeps standard light background", () => {
    const theme = getTheme("light");
    expect(theme.palette.mode).toBe("light");
    expect(theme.palette.background.default).toBe("#fafafa");
  });

  it("Dyslexia font flag injects OpenDyslexic", () => {
    const theme = getTheme("light", { dyslexiaFont: true });
    expect(theme.typography.fontFamily).toContain("OpenDyslexic");
  });

  it("Primary color scheme picker changes the accent", () => {
    const blue = getTheme("light", { primaryColor: "blue" });
    const def = getTheme("light");
    expect(blue.palette.primary.main).not.toBe(def.palette.primary.main);
  });

  it("Falls back to default theme when given an unknown id", () => {
    // ThemeId is a narrowed union, but defensive code in getThemeById falls back
    // to DEFAULT_THEME_ID when find() returns undefined. We exercise that path
    // via a type-cast to make sure runtime behaviour is safe if persisted state
    // ever holds a stale id from a previous app version.
    const t = getTheme("not-a-theme" as never);
    expect(t.palette.mode).toBe("light");
  });
});

import { describe, expect, it } from "vitest";

import { THEMES } from "@/lib/constants/theme.constants";
import { fontCssFamily } from "@/lib/utils/appearance.utils";
import { fontFamilyForId, getTheme } from "@/theme";

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

describe("fontFamilyForId", () => {
  it("maps known sans FontIds to their curated stack", () => {
    expect(fontFamilyForId("inter")).toBe('Inter, "Helvetica Neue", system-ui, sans-serif');
    expect(fontFamilyForId("manrope")).toBe("Manrope, system-ui, sans-serif");
    expect(fontFamilyForId("plex")).toBe('"IBM Plex Sans", system-ui, sans-serif');
    expect(fontFamilyForId("geist")).toBe("Geist, system-ui, sans-serif");
    expect(fontFamilyForId("system")).toBe('-apple-system, "Segoe UI", system-ui, sans-serif');
    expect(fontFamilyForId("opendyslexic")).toBe("OpenDyslexic, Inter, system-ui, sans-serif");
  });

  it("maps known mono FontIds to their curated stack", () => {
    expect(fontFamilyForId("jetbrains-mono")).toBe(
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontFamilyForId("fira-code")).toBe(
      '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontFamilyForId("geist-mono")).toBe(
      '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontFamilyForId("plex-mono")).toBe(
      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontFamilyForId("sf-mono")).toBe(
      'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
    );
  });

  it("resolves a custom font to the uploaded family plus a sans fallback", () => {
    expect(fontFamilyForId("custom:My Brand Font")).toBe(
      '"My Brand Font", "Helvetica Neue", system-ui, sans-serif',
    );
  });

  it("falls back to Inter for unknown or empty selections", () => {
    const fallback = 'Inter, "Helvetica Neue", system-ui, sans-serif';
    expect(fontFamilyForId("not-a-real-font")).toBe(fallback);
    expect(fontFamilyForId("")).toBe(fallback);
  });
});

describe("font resolver parity (fontFamilyForId vs fontCssFamily)", () => {
  // The two resolvers are intentionally duplicated (theme/index owns the MUI
  // typography stack; appearance.utils owns the CSS-var driven surfaces). Most
  // built-in ids resolve identically; this guards against silent drift on the
  // ids that are meant to agree. `inter`, `system`, `opendyslexic`, and the
  // custom prefix diverge on purpose (theme/index pins a "Helvetica Neue" /
  // Inter tier the CSS-var stack omits), so they are excluded from the parity set.
  const PARITY_IDS = [
    "manrope",
    "plex",
    "geist",
    "jetbrains-mono",
    "fira-code",
    "geist-mono",
    "plex-mono",
    "sf-mono",
  ] as const;

  it.each(PARITY_IDS.map((id) => [id] as const))(
    "resolves '%s' to the same stack in both resolvers",
    (id) => {
      expect(fontFamilyForId(id)).toBe(fontCssFamily(id));
    },
  );
});

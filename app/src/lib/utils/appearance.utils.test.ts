import { describe, expect, it } from "vitest";

import {
  CODE_LIGATURES,
  MONO_STACK,
  codeLigatureFeatureSettings,
  fontCssFamily,
  monoFont,
} from "@/lib/utils/appearance.utils";

describe("codeLigatureFeatureSettings", () => {
  it("disables all ligature features for 'off'", () => {
    expect(codeLigatureFeatureSettings("off")).toBe('"liga" 0, "calt" 0, "dlig" 0');
  });

  it("enables the common programming ligatures for 'standard'", () => {
    expect(codeLigatureFeatureSettings("standard")).toBe('"liga" 1, "calt" 1');
  });

  it("layers all 20 stylistic sets on top of the standard ligatures for 'stylistic'", () => {
    const result = codeLigatureFeatureSettings("stylistic");
    // Still starts with the standard pair.
    expect(result.startsWith('"liga" 1, "calt" 1, ')).toBe(true);
    // Every zero-padded stylistic set ss01..ss20 is present and enabled.
    for (let i = 1; i <= 20; i++) {
      const set = `"ss${String(i).padStart(2, "0")}" 1`;
      expect(result).toContain(set);
    }
    // Pin the exact tail boundaries: ss01 first, ss20 last.
    expect(result).toContain('"calt" 1, "ss01" 1,');
    expect(result.endsWith('"ss20" 1')).toBe(true);
  });
});

describe("fontCssFamily", () => {
  it("maps known sans FontIds to their curated stack", () => {
    expect(fontCssFamily("inter")).toBe("Inter, system-ui, sans-serif");
    expect(fontCssFamily("manrope")).toBe("Manrope, system-ui, sans-serif");
    expect(fontCssFamily("plex")).toBe('"IBM Plex Sans", system-ui, sans-serif');
    expect(fontCssFamily("geist")).toBe("Geist, system-ui, sans-serif");
    expect(fontCssFamily("system")).toBe("-apple-system, 'Segoe UI', system-ui, sans-serif");
    expect(fontCssFamily("opendyslexic")).toBe("OpenDyslexic, system-ui, sans-serif");
  });

  it("maps known mono FontIds to their curated stack", () => {
    expect(fontCssFamily("jetbrains-mono")).toBe(
      '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontCssFamily("fira-code")).toBe(
      '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontCssFamily("geist-mono")).toBe(
      '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontCssFamily("plex-mono")).toBe(
      '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    );
    expect(fontCssFamily("sf-mono")).toBe(
      'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace',
    );
  });

  it("resolves a custom font to the uploaded family plus the sans fallback by default", () => {
    expect(fontCssFamily("custom:My Brand Font")).toBe('"My Brand Font", system-ui, sans-serif');
  });

  it("resolves a custom font to the mono fallback when kind is 'mono'", () => {
    expect(fontCssFamily("custom:Hack Nerd Font", "mono")).toBe(
      '"Hack Nerd Font", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
    );
  });

  it("falls back to the sans default for unknown or empty selections", () => {
    expect(fontCssFamily("not-a-real-font")).toBe("system-ui, sans-serif");
    expect(fontCssFamily("")).toBe("system-ui, sans-serif");
  });
});

describe("MONO_STACK", () => {
  it("references the --recrest-font-mono custom property with a monospace fallback chain", () => {
    expect(MONO_STACK).toContain("var(--recrest-font-mono,");
    expect(MONO_STACK).toContain("ui-monospace");
    expect(MONO_STACK).toContain("SFMono-Regular");
    expect(MONO_STACK).toContain("Menlo");
    expect(MONO_STACK).toContain("Consolas");
    expect(MONO_STACK.trimEnd().endsWith("monospace)")).toBe(true);
  });
});

describe("monoFont", () => {
  it("uses MONO_STACK as its fontFamily", () => {
    expect(monoFont.fontFamily).toBe(MONO_STACK);
  });

  it("carries the code-ligature feature settings", () => {
    expect(monoFont.fontFeatureSettings).toBe(CODE_LIGATURES);
    expect(monoFont.fontFeatureSettings).toContain("var(--recrest-code-ligatures,");
  });
});

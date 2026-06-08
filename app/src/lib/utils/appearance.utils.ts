import {
  CUSTOM_FONT_PREFIX,
  FONT_LABELS,
  type FontSelection,
  type FontSizeId,
  type LigatureMode,
} from "@recrest/shared";

import { THEMES, type ThemeId } from "@/lib/constants/theme.constants";

const SANS_FALLBACK = "system-ui, sans-serif";
const MONO_FALLBACK = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

export type ThemeChoice = "system" | ThemeId;

/**
 * Canonical monospace font stack for code surfaces. Resolves to the user's
 * chosen code font via the `--recrest-font-mono` custom property (set in
 * `ThemeWrapper`), falling back to system monospace before the var is applied.
 */
export const MONO_STACK =
  "var(--recrest-font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace)";

/**
 * `font-feature-settings` value for code surfaces, resolved from the user's
 * ligature mode via the `--recrest-code-ligatures` custom property (set in
 * `ThemeWrapper`). Code surfaces must set this explicitly because the
 * inherited `body` value tunes the UI font (`cv11`/`ss01`/`ss03` for Inter),
 * which would otherwise leak into monospace text. Falls back to the standard
 * programming ligatures before the var is applied.
 */
export const CODE_LIGATURES = 'var(--recrest-code-ligatures, "liga" 1, "calt" 1)';

/** Concrete `font-feature-settings` for a ligature mode (drives both the CSS
 *  var in `ThemeWrapper` and the live previews in the settings picker). */
export function codeLigatureFeatureSettings(mode: LigatureMode): string {
  switch (mode) {
    case "off":
      return '"liga" 0, "calt" 0, "dlig" 0';
    case "stylistic":
      return (
        '"liga" 1, "calt" 1, ' +
        Array.from({ length: 20 }, (_, i) => `"ss${String(i + 1).padStart(2, "0")}" 1`).join(", ")
      );
    case "standard":
    default:
      return '"liga" 1, "calt" 1';
  }
}

/**
 * Style fragment for code/monospace text: the user's code font plus their
 * chosen ligature mode. Spread into a `styled()` block or `style` prop instead
 * of hardcoding a `fontFamily` string, so code surfaces follow both settings.
 */
export const monoFont = {
  fontFamily: MONO_STACK,
  fontFeatureSettings: CODE_LIGATURES,
} as const;

/**
 * CSS `font-family` stack for a font picker value. Built-in ids map to their
 * curated stack; a `custom:<family>` value resolves to the uploaded family
 * plus a fallback (`kind` picks the sans vs. mono tail, used before the
 * `FontFace` finishes loading or if the file is missing).
 */
export function fontCssFamily(id: FontSelection, kind: "sans" | "mono" = "sans"): string {
  if (id.startsWith(CUSTOM_FONT_PREFIX)) {
    const family = id.slice(CUSTOM_FONT_PREFIX.length);
    return `"${family}", ${kind === "mono" ? MONO_FALLBACK : SANS_FALLBACK}`;
  }
  switch (id) {
    case "inter":
      return "Inter, system-ui, sans-serif";
    case "manrope":
      return "Manrope, system-ui, sans-serif";
    case "plex":
      return '"IBM Plex Sans", system-ui, sans-serif';
    case "geist":
      return "Geist, system-ui, sans-serif";
    case "system":
      return "-apple-system, 'Segoe UI', system-ui, sans-serif";
    case "opendyslexic":
      return "OpenDyslexic, system-ui, sans-serif";
    case "jetbrains-mono":
      return '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "fira-code":
      return '"Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "geist-mono":
      return '"Geist Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "plex-mono":
      return '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace';
    case "sf-mono":
      return 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace';
    default:
      return `${SANS_FALLBACK}`;
  }
}

/** Human-readable label for a font picker value (custom uploads show their
 *  family name; built-ins use {@link FONT_LABELS}). */
export function fontLabel(id: FontSelection): string {
  if (id.startsWith(CUSTOM_FONT_PREFIX)) return id.slice(CUSTOM_FONT_PREFIX.length);
  return FONT_LABELS[id as keyof typeof FONT_LABELS] ?? id;
}

/** Human-readable label for a `FontSizeId`. */
export function fontSizeLabel(id: FontSizeId): string {
  switch (id) {
    case "sm":
      return "Small";
    case "md":
      return "Medium";
    case "lg":
      return "Large";
    case "xl":
      return "Extra large";
  }
}

/** Human-readable label for the rendered theme choice (incl. `system`). */
export function themeChoiceLabel(choice: ThemeChoice): string {
  if (choice === "system") return "System";
  const th = THEMES.find((x) => x.id === choice);
  return th?.label ?? "Light";
}

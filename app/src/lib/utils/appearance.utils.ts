import type { FontId, FontSizeId } from "@recrest/shared";

import { THEMES, type ThemeId } from "@/lib/constants/theme.constants";

export type ThemeChoice = "system" | ThemeId;

/** CSS `font-family` stack for a logical font id from `@recrest/shared`. */
export function fontCssFamily(id: FontId): string {
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
  }
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

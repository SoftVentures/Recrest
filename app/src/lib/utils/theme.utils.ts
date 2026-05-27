import {
  DEFAULT_PRIMARY_COLOR,
  DEFAULT_THEME_ID,
  PRIMARY_COLOR_SCHEMES,
  type PrimaryColorScheme,
  THEMES,
  type ThemeId,
} from "@/lib/constants/theme.constants";

export function getPrimaryColorScheme(scheme?: PrimaryColorScheme | null) {
  return PRIMARY_COLOR_SCHEMES[scheme ?? DEFAULT_PRIMARY_COLOR];
}

export function getThemeById(id: ThemeId) {
  return THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

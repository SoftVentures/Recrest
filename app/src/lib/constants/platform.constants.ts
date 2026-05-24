/**
 * Canonical platform identifiers used across the renderer (detection in
 * `usePlatform`, modifier-key shortcuts, platform-specific copy).
 *
 * Adding a new OS = add an entry here + the matching label. Detection and any
 * platform switches downstream import `Platform` / `PLATFORM_LABELS` and pick
 * the value up automatically.
 */
export const Platform = {
  MAC: "mac",
  WINDOWS: "windows",
  LINUX: "linux",
} as const;

export type Platform = (typeof Platform)[keyof typeof Platform];

export const PLATFORMS = [
  Platform.MAC,
  Platform.WINDOWS,
  Platform.LINUX,
] as const satisfies readonly Platform[];

/** Display label per platform. Extend in lock-step with `Platform`. */
export const PLATFORM_LABELS: Record<Platform, string> = {
  [Platform.MAC]: "macOS",
  [Platform.WINDOWS]: "Windows",
  [Platform.LINUX]: "Linux",
};

/** Modifier-key glyph rendered as the "command" key on each platform. */
export const PLATFORM_MODIFIER_LABELS: Record<
  Platform,
  { mod: string; shift: string; alt: string; joiner: string }
> = {
  [Platform.MAC]: { mod: "⌘", shift: "⇧", alt: "⌥", joiner: "" },
  [Platform.WINDOWS]: { mod: "Ctrl", shift: "Shift", alt: "Alt", joiner: "+" },
  [Platform.LINUX]: { mod: "Ctrl", shift: "Shift", alt: "Alt", joiner: "+" },
};

/** Which window-chrome style to render. `"none"` = no custom chrome (web dev). */
export const WindowChrome = {
  MACOS_OVERLAY: "macos-overlay",
  WIN11: "win11",
  GNOME: "gnome",
  NONE: "none",
} as const;

export type WindowChrome = (typeof WindowChrome)[keyof typeof WindowChrome];

/** Default window chrome per platform. `"none"` fallback handled by the hook. */
export const PLATFORM_WINDOW_CHROME: Record<Platform, WindowChrome> = {
  [Platform.MAC]: WindowChrome.MACOS_OVERLAY,
  [Platform.WINDOWS]: WindowChrome.WIN11,
  [Platform.LINUX]: WindowChrome.GNOME,
};

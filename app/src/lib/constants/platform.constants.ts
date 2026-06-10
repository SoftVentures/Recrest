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

/** Height in pixels of each chrome variant. Mirrors the `height` set in the
 *  matching titlebar component (`MacOverlayTitlebar`, `Win11Titlebar`,
 *  `GnomeTitlebar`). Anything that paints over the app frame (drawers,
 *  fixed overlays) needs to add this to the 64 px app header. */
export const WINDOW_CHROME_HEIGHT_PX: Record<WindowChrome, number> = {
  [WindowChrome.MACOS_OVERLAY]: 38,
  [WindowChrome.WIN11]: 32,
  [WindowChrome.GNOME]: 42,
  [WindowChrome.NONE]: 0,
};

/**
 * Demo / screenshot escape hatch: `?demoChrome=macos` (or `win11` / `gnome`)
 * forces a window-chrome variant even in pure-web mode, where the browser
 * would otherwise own the frame and `useWindowChrome` returns `"none"`. This
 * lets `yarn dev:web` and the README capture spec render the real titlebar
 * component so marketing shots look like the installed app. Production (real
 * Tauri) ignores it — the OS already provides chrome there. Because the web
 * has no OS to draw macOS traffic-lights, `MacOverlayTitlebar` paints faux
 * lights whenever it isn't running under the real Tauri runtime.
 */
export const DEMO_CHROME_QUERY_PARAM = "demoChrome";

export const DEMO_CHROME_VALUES: Record<string, WindowChrome> = {
  macos: WindowChrome.MACOS_OVERLAY,
  win11: WindowChrome.WIN11,
  gnome: WindowChrome.GNOME,
};

import type { AppSettings, AutoUpdateMode, FontId, FontSizeId } from "@recrest/shared";

import type { PrimaryColorScheme, ThemeId } from "@/lib/constants/theme.constants";

export interface DesktopPrefs {
  /** Launch Recrest automatically when the OS user logs in. */
  autoStart: boolean;
  /** When auto-starting, open silently to the tray instead of the foreground. */
  startMinimized: boolean;
  /** Closing the window keeps the app alive in the tray (quit via tray menu). */
  closeToTray: boolean;
}

export interface NotificationPrefs {
  /** Master toggle — every per-event sub-toggle is gated behind this. */
  enabled: boolean;
  newPr: boolean;
  ciFailed: boolean;
  mergeReady: boolean;
}

export interface UpdatePrefs {
  mode: AutoUpdateMode;
}

export interface SettingsState {
  /** The theme to apply right now. When `followsSystem` is true this slot is
   *  kept in sync with the OS `prefers-color-scheme` media query. */
  themeId: ThemeId;
  /** True when the user picked "System" in the settings dropdown — flips the
   *  effective `themeId` on OS appearance change instead of staying fixed. */
  followsSystem: boolean;
  primaryColor: PrimaryColorScheme;
  /** Legacy boolean flag — superseded by `font === "opendyslexic"` but kept
   *  so the existing settings persist layer (with `dyslexiaFont` baked in)
   *  still parses. New code should read/write `font` instead. */
  dyslexiaFont: boolean;
  font: FontId;
  fontSize: FontSizeId;
  /** Accessibility — reinforce borders + dim text for better legibility. */
  highContrast: boolean;
  /** Disable non-essential animations and CSS transitions. */
  reducedMotion: boolean;
  /** Always underline links instead of only on hover. */
  underlineLinks: boolean;
  locale: string;
  /** Background git/PR refresh interval, persisted in minutes. */
  pollingIntervalMinutes: number;
  desktop: DesktopPrefs;
  notifications: NotificationPrefs;
  updates: UpdatePrefs;
  backend: AppSettings | null;
  loading: boolean;
  error: string | null;
}

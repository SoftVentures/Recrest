import type {
  AppSettings,
  AutoUpdateMode,
  CustomFont,
  DateFormat,
  DiscoveredApp,
  FontSelection,
  FontSizeId,
  LigatureMode,
  ShellDetection,
  TerminalDetection,
  TimeFormat,
  WeekStart,
} from "@recrest/shared";

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

/** Orthogonal window-translucency effect — independent of `themeId`. */
export interface TranslucencyPrefs {
  enabled: boolean;
  /** 0..100, clamped at the reducer boundary. */
  intensity: number;
  /** Extra backdrop-filter blur stacked on top of the OS material. 0..100,
   *  mapped to 0..MAX_BLUR_PX in CSS. */
  blurIntensity: number;
}

/** Locale-aware rendering preferences — drive `Intl.DateTimeFormat` /
 *  `formatDistanceToNow`-style helpers across the app. Persisted on the
 *  backend under `appearance.localePrefs`. */
export interface LocalePrefs {
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  weekStart: WeekStart;
  /** `null` => follow the active language. Otherwise an ISO 3166-1 alpha-2
   *  code (e.g. `"US"`, `"GB"`, `"DE"`). */
  region: string | null;
  /** `null` => follow the host system's zone. Otherwise an IANA time-zone id
   *  (e.g. `"Europe/Berlin"`). */
  timeZone: string | null;
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
  font: FontSelection;
  /** Monospace font for code surfaces (snippets, diffs, …); separate from `font`. */
  codeFont: FontSelection;
  /** Ligature rendering mode for code surfaces; separate from `codeFont`. */
  codeLigatures: LigatureMode;
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
  /** Orthogonal translucency effect (any theme can be made translucent). */
  translucency: TranslucencyPrefs;
  /** Locale-aware rendering preferences (date/time format, week start, region). */
  localePrefs: LocalePrefs;
  backend: AppSettings | null;
  /** OS-probe results; `null` until `loadDetectedTerminals` resolved.
   *  Outside Tauri this stays `null` and the UI falls back to stub maps. */
  detectedTerminals: TerminalDetection[] | null;
  detectedShells: ShellDetection[] | null;
  /** Detected IDE ids (`detect_ides` probe); `null` until resolved. */
  detectedIdes: string[] | null;
  /** Bundle/registry/.desktop-based terminal discovery (`list_terminals`).
   *  Preferred over `detectedTerminals` when non-null; carries real install
   *  metadata (display name, launch spec) for accurate picker rendering. */
  discoveredTerminals: DiscoveredApp[] | null;
  /** Bundle/registry/.desktop-based IDE discovery (`list_ides`). */
  discoveredIdes: DiscoveredApp[] | null;
  /** User-uploaded custom fonts (`list_custom_fonts`); empty until loaded. */
  customFonts: CustomFont[];
  loading: boolean;
  error: string | null;
}

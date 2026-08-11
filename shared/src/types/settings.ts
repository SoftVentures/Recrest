import type { LocaleSettings } from "../constants/locale.js";
import type { FontSelection, FontSizeId, LigatureMode } from "../constants/ui.js";

export type ThemeMode = "light" | "dark" | "system";

/** Renderer-side theme variant. Lives on `appearance.themeId` so the
 *  backend can persist the user's last pick.
 *
 *  Translucency used to ride here as `glassy` and a high-contrast pure-
 *  black variant rode as `oled`; both retired into orthogonal toggles
 *  (`appearance.translucency` + the accessibility `highContrast` flag),
 *  so the slot is now light/dark only. The Rust side migrates legacy
 *  values on load — `glassy` → `dark` + translucency on, `oled` → `dark`. */
export type ThemeIdValue = "light" | "dark";

/** Accent color scheme — must match the keys of `PRIMARY_COLOR_SCHEMES`
 *  in `app/src/lib/constants/theme.constants.ts`. */
export type PrimaryColorScheme = "default" | "blue" | "green" | "purple" | "pink" | "amber";

export const AutoUpdateMode = {
  AUTO: "auto",
  MANUAL: "manual",
  OFF: "off",
} as const;
export type AutoUpdateMode = (typeof AutoUpdateMode)[keyof typeof AutoUpdateMode];

export interface NotificationSettings {
  enabled: boolean;
  newPr: boolean;
  ciFailed: boolean;
  mergeReady: boolean;
}

/** Window-translucency effect — orthogonal to `themeId`. When `enabled` the
 *  backend asks the OS to render the window with native vibrancy / liquid
 *  glass; the user controls two independent dials:
 *   - `intensity` (= transparency): 0 = fully opaque theme tint, 100 = no
 *     tint at all (pure OS material exposure).
 *   - `blurIntensity`: extra CSS `backdrop-filter: blur(...)` layered on top
 *     of the OS material's natural blur. 0 = no extra blur (pure material),
 *     100 = max blur (~30 px). */
export interface TranslucencySettings {
  enabled: boolean;
  /** 0 (faintest) .. 100 (strongest). Clamped at every entry point. */
  intensity: number;
  /** Extra backdrop-filter blur layered on top of the OS material. 0..100,
   *  mapped to 0..30 px. Clamped at every entry point. */
  blurIntensity: number;
}

/** Renderer-scoped appearance tokens, persisted via the Tauri backend so
 *  every Recrest surface reads them from a single source of truth. */
export interface AppearanceSettings {
  themeId: ThemeIdValue;
  /** True ⇔ track `prefers-color-scheme`. When false, `themeId` is the
   *  user's explicit pick and the OS toggle is ignored. */
  followsSystem: boolean;
  primaryColor: PrimaryColorScheme;
  /** UI font — a built-in {@link FontId} or a `custom:<family>` upload. */
  font: FontSelection;
  /** Monospace font for code surfaces (snippets, diffs, …). Separate from the
   *  UI `font` so the interface and code can use different typefaces. Accepts
   *  built-in mono {@link FontId}s or a `custom:<family>` upload. */
  codeFont: FontSelection;
  /** Ligature rendering mode for code surfaces — independent of `codeFont`. */
  codeLigatures: LigatureMode;
  fontSize: FontSizeId;
  /** Orthogonal translucency effect — any theme can be made translucent. */
  translucency: TranslucencySettings;
  /** Locale-aware rendering preferences (date / time format, week start,
   *  optional BCP-47 region override). Lives under `appearance` so the
   *  whole renderer-scoped preference bag stays in one substruct. */
  localePrefs: LocaleSettings;
}

/** A user-uploaded font, stored under `<app_data>/fonts/` and registered at
 *  runtime via the Font Loading API. Mirrors `commands::fonts::CustomFont`. */
export interface CustomFont {
  /** Stable id (the sanitized family name); used for delete + dedupe. */
  id: string;
  /** CSS family name the font is registered under and selected by
   *  (`custom:<family>` in the `font` / `codeFont` slots). */
  family: string;
  /** On-disk file name under the managed fonts dir. */
  fileName: string;
  /** CSS `@font-face` format hint (`truetype` | `opentype` | `woff2` | `woff`). */
  format: string;
  /** Base64-encoded font bytes for runtime `FontFace` registration. */
  data: string;
}

export interface AccessibilitySettings {
  dyslexiaFont: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  underlineLinks: boolean;
}

export interface WindowStateSettings {
  sidebarCollapsed: boolean;
}

export interface PrivacySettings {
  fetchFavicons: boolean;
}

export interface SshKeyInfo {
  path: string;
  name: string;
  hasPublic: boolean;
}

export interface SshKeyListing {
  dir: string | null;
  keys: SshKeyInfo[];
}

export interface RepoImportDefaults {
  groupId: string | null;
  providerId: string | null;
}

export interface GitConfigOverride {
  userName: string | null;
  userEmail: string | null;
}

export interface TerminalSettings {
  id: string | null;
  profile: string | null;
  customCommand: string | null;
}

export type RepoListViewMode = "grouped" | "flat" | "card";

export type SortDirection = "asc" | "desc";

export interface RepoListSort {
  field: string;
  direction: SortDirection;
}

export interface AppSettings {
  pollingIntervalMs: number;
  defaultIde: string | null;
  theme: ThemeMode;
  locale: string;
  scanPaths: string[];
  autoStart: boolean;
  autoUpdate: AutoUpdateMode;
  startMinimized: boolean;
  closeToTray: boolean;
  notifications: NotificationSettings;
  crashReporting: boolean;

  // ---- Phase 0.1 additive fields ----
  pinnedRepoIds: string[];
  /** Manual author merges keyed by `signatureKey` (see Plan 1 §A.4). */
  authorAliases: Record<string, string>;
  uiScale: number;
  repoListViewMode: RepoListViewMode;
  repoListSort: RepoListSort;
  repoImportDefaults: RepoImportDefaults;
  defaultScanPath: string | null;
  terminal: TerminalSettings;
  /** Preferred shell id (e.g. `zsh`, `fish`) or null for auto. */
  shell: string | null;
  commitMessageTemplate: string;
  privacy: PrivacySettings;
  /** Global default SSH private key path for all SSH remotes. A repo's own
   *  `sshKeyPath` overrides it; otherwise it's tried before ssh-agent. */
  defaultSshKeyPath: string | null;
  gitConfigOverride: GitConfigOverride;

  // ---- Phase 2: renderer-scoped preferences moved off localStorage ----
  appearance: AppearanceSettings;
  accessibility: AccessibilitySettings;
  windowState: WindowStateSettings;
}

export interface RepoSettings {
  id: string;
  defaultIde: string | null;
  pinned: boolean;
}

/** Report of a `settings.json` that existed on boot but could not be parsed.
 *  The file is quarantined instead of being silently overwritten with
 *  defaults, so the user can still recover their repos, groups and pins. */
export interface SettingsCorruption {
  /** Where the unparseable file was moved to, or null if even the rename
   *  failed — in which case the original is still in place. Display-only: the
   *  backend sends a lossy string (`Option<String>`, not `Option<PathBuf>`)
   *  because serializing a non-UTF-8 path errors, and that would fail this
   *  whole response exactly when the user needs it to recover their data. */
  quarantinePath: string | null;
  /** Unix seconds at detection; matches the timestamp in the file name. */
  detectedAt: number;
  /** The parser error, verbatim. */
  message: string;
}

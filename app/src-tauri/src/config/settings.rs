use std::collections::BTreeMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

pub const DEFAULT_POLLING_INTERVAL_MS: u64 = 5 * 60 * 1000;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NotificationSettings {
    pub enabled: bool,
    pub new_pr: bool,
    pub ci_failed: bool,
    pub merge_ready: bool,
}

impl Default for NotificationSettings {
    fn default() -> Self {
        Self {
            enabled: false,
            new_pr: true,
            ci_failed: true,
            merge_ready: true,
        }
    }
}

/// Renderer-scoped appearance + accessibility tokens that the React shell
/// owns end-to-end. Phase-2 moves these out of `localStorage` and onto the
/// Tauri backend so every Recrest surface (web preview included) reads them
/// from a single source of truth.
///
/// All fields are `#[serde(default)]` so existing `settings.json` files
/// migrate cleanly: missing fields fall back to the renderer's defaults.
/// Orthogonal window-translucency effect. Independent of `theme_id` — any
/// theme can be made translucent on top. `intensity` is a 0..100 hint the
/// backend maps to a tint alpha on the native liquid-glass / vibrancy
/// effect; the renderer surfaces it as a 0..100 slider.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TranslucencySettings {
    #[serde(default)]
    pub enabled: bool,
    #[serde(default = "default_translucency_intensity")]
    pub intensity: u8,
    /// Extra backdrop-filter blur on top of the OS material. 0..100 hint;
    /// the renderer maps it to 0..30 px CSS blur. `#[serde(default)]` lets
    /// settings files predating the blur split load cleanly.
    #[serde(default = "default_blur_intensity")]
    pub blur_intensity: u8,
}

/// Mirrors `DEFAULT_TRANSLUCENCY_INTENSITY` in
/// `app/src/lib/constants/theme.constants.ts` — keep them in lock-step.
/// 50 sits at the middle of the linearised range: the Rust tint alpha caps
/// at ~31 %, so every slider position from 0 to 100 reads as translucent
/// rather than as a milky-white wash.
fn default_translucency_intensity() -> u8 {
    50
}

/// Mirrors `DEFAULT_BLUR_INTENSITY` in
/// `app/src/lib/constants/theme.constants.ts` — keep them in lock-step.
fn default_blur_intensity() -> u8 {
    30
}

impl Default for TranslucencySettings {
    fn default() -> Self {
        Self {
            enabled: false,
            intensity: default_translucency_intensity(),
            blur_intensity: default_blur_intensity(),
        }
    }
}

/// Locale-aware rendering preferences (date / time format, week start,
/// optional BCP-47 region override). Lives under `appearance` so the whole
/// renderer-scoped preference bag stays in one substruct. Every field is
/// `#[serde(default)]` so settings.json files predating this addition load
/// cleanly and fall back to the renderer's defaults.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocaleSettings {
    #[serde(default = "default_date_format")]
    pub date_format: String,
    #[serde(default = "default_time_format")]
    pub time_format: String,
    #[serde(default = "default_week_start")]
    pub week_start: String,
    /// `None` => follow the active language (no region suffix). Otherwise an
    /// ISO 3166-1 alpha-2 code (e.g. `"US"`, `"GB"`, `"DE"`).
    #[serde(default)]
    pub region: Option<String>,
}

fn default_date_format() -> String {
    "relative".into()
}

fn default_time_format() -> String {
    "24h".into()
}

fn default_week_start() -> String {
    "monday".into()
}

impl Default for LocaleSettings {
    fn default() -> Self {
        Self {
            date_format: default_date_format(),
            time_format: default_time_format(),
            week_start: default_week_start(),
            region: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppearanceSettings {
    /// Renderer-side theme variant. Always `light` or `dark` on a fresh
    /// install. Historical values migrate at load time (see
    /// `migrate_legacy`): `glassy` → `dark` + `translucency.enabled`,
    /// `oled` → `dark` (the OLED variant was retired as a high-contrast
    /// duplicate).
    pub theme_id: String,
    /// True ⇔ the renderer should track `prefers-color-scheme`. Mirrors the
    /// legacy `theme === "system"` semantic but kept explicit so the renderer
    /// can persist "user picked Light" vs. "user is on Light because OS says so".
    pub follows_system: bool,
    /// Accent / brand color (named scheme, not hex). One of: default, blue,
    /// green, purple, pink, orange.
    pub primary_color: String,
    /// Renderer font slot — "inter" | "opendyslexic" | future additions.
    pub font: String,
    /// Monospace font for code surfaces, separate from the UI `font`. New in the
    /// code-font split, so `#[serde(default)]` keeps pre-split settings loading.
    #[serde(default = "default_code_font")]
    pub code_font: String,
    /// Ligature mode for code surfaces — "off" | "standard" | "stylistic".
    /// Separate from `code_font`; `#[serde(default)]` keeps older files loading.
    #[serde(default = "default_code_ligatures")]
    pub code_ligatures: String,
    /// Renderer font size token — "sm" | "md" | "lg".
    pub font_size: String,
    /// Orthogonal window-translucency effect. Additive — files written before
    /// the split deserialise with the default (`enabled: false`, intensity 50).
    #[serde(default)]
    pub translucency: TranslucencySettings,
    /// Locale-aware rendering preferences (date/time format, week start,
    /// region override). Additive — files written before the split fall back
    /// to the renderer defaults.
    #[serde(default)]
    pub locale_prefs: LocaleSettings,
}

fn default_code_font() -> String {
    "jetbrains-mono".into()
}

fn default_code_ligatures() -> String {
    "standard".into()
}

impl Default for AppearanceSettings {
    fn default() -> Self {
        Self {
            theme_id: "light".into(),
            follows_system: true,
            primary_color: "default".into(),
            font: "inter".into(),
            code_font: default_code_font(),
            code_ligatures: default_code_ligatures(),
            font_size: "md".into(),
            translucency: TranslucencySettings::default(),
            locale_prefs: LocaleSettings::default(),
        }
    }
}

impl AppearanceSettings {
    /// One-shot migrations applied at load time:
    /// - `glassy` → `dark` + `translucency.enabled = true` (the historical
    ///   translucent dark window — translucency is now orthogonal so the
    ///   theme slot is freed up).
    /// - `oled` → `dark` (the OLED-Black variant was retired as a
    ///   functional duplicate of dark + high-contrast).
    pub fn migrate_legacy(&mut self) -> bool {
        if self.theme_id == "glassy" {
            self.theme_id = "dark".into();
            self.translucency = TranslucencySettings {
                enabled: true,
                intensity: default_translucency_intensity(),
                blur_intensity: default_blur_intensity(),
            };
            true
        } else if self.theme_id == "oled" {
            self.theme_id = "dark".into();
            true
        } else {
            false
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessibilitySettings {
    /// Legacy boolean kept in sync with `appearance.font === "opendyslexic"`.
    /// Tests written against the pre-Phase-2 shape keep working.
    #[serde(default)]
    pub dyslexia_font: bool,
    #[serde(default)]
    pub high_contrast: bool,
    #[serde(default)]
    pub reduced_motion: bool,
    #[serde(default)]
    pub underline_links: bool,
}

/// Tiny window-state slice persisted alongside settings (the sidebar lives
/// here because it survives across sessions exactly like an appearance
/// preference). Future window-state bits (panel splits, last-active route)
/// land in the same struct.
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowStateSettings {
    #[serde(default)]
    pub sidebar_collapsed: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivacySettings {
    /// Whether the app may fetch favicons from remote hosts as a fallback
    /// when no local logo is found. Off by default — privacy-conscious users
    /// can opt in.
    #[serde(default)]
    pub fetch_favicons: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoImportDefaults {
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub provider_id: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", default)]
pub struct GitConfigOverride {
    pub user_name: Option<String>,
    pub user_email: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TerminalSettings {
    /// Stable id of the chosen terminal (e.g. `iterm`, `wezterm`, `wt`).
    /// `None` means "auto-detect at runtime".
    #[serde(default)]
    pub id: Option<String>,
    /// Optional profile name passed to terminals that support `--profile`.
    #[serde(default)]
    pub profile: Option<String>,
    /// Free-form override command (overrides id+profile if set).
    #[serde(default)]
    pub custom_command: Option<String>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RepoListViewMode {
    #[default]
    Grouped,
    Flat,
    Card,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SortDirection {
    #[default]
    Asc,
    Desc,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoListSort {
    /// Sort field key. Empty string means "default ordering".
    #[serde(default)]
    pub field: String,
    #[serde(default)]
    pub direction: SortDirection,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub struct AppSettings {
    pub polling_interval_ms: u64,
    pub default_ide: Option<String>,
    pub theme: String,
    pub locale: String,
    pub scan_paths: Vec<String>,
    #[serde(default)]
    pub auto_start: bool,
    #[serde(default = "default_auto_update")]
    pub auto_update: String,
    #[serde(default)]
    pub start_minimized: bool,
    #[serde(default = "default_close_to_tray")]
    pub close_to_tray: bool,
    #[serde(default)]
    pub notifications: NotificationSettings,
    #[serde(default)]
    pub crash_reporting: bool,
    #[serde(default)]
    pub repos: BTreeMap<String, RepoRecord>,
    #[serde(default)]
    pub groups: BTreeMap<String, RepoGroup>,
    /// Per-provider, non-secret overrides (primarily the API base URL for
    /// self-hosted instances). Tokens still live in the OS keychain.
    #[serde(default)]
    pub provider_settings: BTreeMap<String, ProviderSettings>,

    // ---- Plan 1 / Plan 3 / Plan 4 additive fields (Phase 0.1) ----
    #[serde(default)]
    pub pinned_repo_ids: Vec<String>,
    /// Manual author merges. Keys and values are `signatureKey`s as produced
    /// by `git::author_normalize::signature_key`. A mapping `K → V` means
    /// "treat author with key K as canonical key V".
    #[serde(default)]
    pub author_aliases: BTreeMap<String, String>,
    #[serde(default = "default_ui_scale")]
    pub ui_scale: f32,
    #[serde(default)]
    pub repo_list_view_mode: RepoListViewMode,
    #[serde(default)]
    pub repo_list_sort: RepoListSort,
    #[serde(default)]
    pub repo_import_defaults: RepoImportDefaults,
    #[serde(default)]
    pub default_scan_path: Option<String>,
    #[serde(default)]
    pub terminal: TerminalSettings,
    /// Stable id of the preferred shell (e.g. `zsh`, `fish`) launched inside the
    /// terminal. `None` = auto / system default. See `shared` `SHELL_IDS`.
    #[serde(default)]
    pub shell: Option<String>,
    #[serde(default = "default_commit_message_template")]
    pub commit_message_template: String,
    #[serde(default)]
    pub privacy: PrivacySettings,
    #[serde(default)]
    pub git_config_override: GitConfigOverride,
    /// Global default SSH private key path used for all SSH remotes. A repo's
    /// own `ssh_key_path` overrides it; otherwise this is tried before
    /// ssh-agent. `None` = rely on ssh-agent / global config.
    #[serde(default)]
    pub default_ssh_key_path: Option<String>,

    // ---- Phase 2: renderer-scoped preferences moved off localStorage ----
    #[serde(default)]
    pub appearance: AppearanceSettings,
    #[serde(default)]
    pub accessibility: AccessibilitySettings,
    #[serde(default)]
    pub window_state: WindowStateSettings,
}

fn default_auto_update() -> String {
    "manual".into()
}

fn default_close_to_tray() -> bool {
    false
}

fn default_ui_scale() -> f32 {
    1.0
}

fn default_commit_message_template() -> String {
    "{{author}}: {{date}}".into()
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            polling_interval_ms: DEFAULT_POLLING_INTERVAL_MS,
            default_ide: None,
            theme: "system".into(),
            locale: "en".into(),
            scan_paths: Vec::new(),
            auto_start: false,
            auto_update: default_auto_update(),
            start_minimized: false,
            close_to_tray: default_close_to_tray(),
            notifications: NotificationSettings::default(),
            crash_reporting: false,
            repos: BTreeMap::new(),
            groups: BTreeMap::new(),
            provider_settings: BTreeMap::new(),
            pinned_repo_ids: Vec::new(),
            author_aliases: BTreeMap::new(),
            ui_scale: default_ui_scale(),
            repo_list_view_mode: RepoListViewMode::default(),
            repo_list_sort: RepoListSort::default(),
            repo_import_defaults: RepoImportDefaults::default(),
            default_scan_path: None,
            terminal: TerminalSettings::default(),
            shell: None,
            commit_message_template: default_commit_message_template(),
            privacy: PrivacySettings::default(),
            git_config_override: GitConfigOverride::default(),
            default_ssh_key_path: None,
            appearance: AppearanceSettings::default(),
            accessibility: AccessibilitySettings::default(),
            window_state: WindowStateSettings::default(),
        }
    }
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderSettings {
    /// Override for the API base URL (e.g. `https://gitlab.my-company.com/api/v4`
    /// or `https://github.my-company.com/api/v3`). Empty / absent means "use
    /// the cloud default baked into the provider".
    #[serde(default)]
    pub base_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoRecord {
    pub id: String,
    pub name: String,
    pub path: PathBuf,
    pub group_id: Option<String>,
    pub remote_url: Option<String>,
    pub provider_id: Option<String>,
    /// Optional path to an SSH private key used when fetching/pushing this
    /// specific repo. `None` means "use ssh-agent / global config".
    #[serde(default)]
    pub ssh_key_path: Option<String>,
    /// User-uploaded logo override (absolute path under
    /// `<app_data>/repo-logos/`). Takes precedence over the in-repo
    /// auto-detection when set. Cleared by `clear_repo_logo`.
    #[serde(default)]
    pub custom_logo_path: Option<PathBuf>,
    /// `true` when the user added this repo explicitly (Add-repo / clone),
    /// `false` when it was auto-discovered by a scan. Scanned repos that no
    /// longer sit under any configured scan root are pruned on the next
    /// scan/boot; manual ones are kept wherever they live. Legacy records
    /// (no field) default to `false` — i.e. treated as scanned.
    #[serde(default)]
    pub manual: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoGroup {
    pub id: String,
    pub name: String,
    pub color: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Settings persisted before Phase 0.1 must keep deserialising — every
    /// new field has `serde(default)` and the legacy file lacks them all.
    #[test]
    fn legacy_settings_json_loads_with_defaults() {
        let legacy = r#"{
            "pollingIntervalMs": 300000,
            "defaultIde": null,
            "theme": "dark",
            "locale": "en",
            "scanPaths": ["/Users/x/code"]
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).expect("legacy json must parse");
        assert_eq!(parsed.theme, "dark");
        assert_eq!(parsed.scan_paths, vec!["/Users/x/code".to_string()]);
        // Phase 0.1 fields fall back to their defaults.
        assert!(parsed.pinned_repo_ids.is_empty());
        assert!(parsed.author_aliases.is_empty());
        assert!((parsed.ui_scale - 1.0).abs() < f32::EPSILON);
        assert_eq!(parsed.repo_list_view_mode, RepoListViewMode::Grouped);
        assert!(parsed.repo_list_sort.field.is_empty());
        assert_eq!(parsed.repo_list_sort.direction, SortDirection::Asc);
        assert!(parsed.default_scan_path.is_none());
        assert!(parsed.terminal.id.is_none());
        assert!(parsed.terminal.profile.is_none());
        assert!(parsed.terminal.custom_command.is_none());
        assert_eq!(parsed.commit_message_template, "{{author}}: {{date}}");
        assert!(!parsed.privacy.fetch_favicons);
        // Appearance code-font fields were added after the split; legacy JSON
        // without them must fall back to the renderer defaults rather than
        // silently regressing.
        assert_eq!(parsed.appearance.code_font, "jetbrains-mono");
        assert_eq!(parsed.appearance.code_ligatures, "standard");
    }

    /// Settings JSON that carries an `appearance` block but predates the
    /// code-font split (no `codeFont` / `codeLigatures` keys) must still
    /// migrate those two fields to their `serde(default)` values.
    #[test]
    fn legacy_appearance_without_code_font_loads_defaults() {
        let legacy = r#"{
            "appearance": {
                "themeId": "dark",
                "followsSystem": false,
                "primaryColor": "blue",
                "font": "inter",
                "fontSize": "md"
            }
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).expect("legacy appearance json");
        assert_eq!(parsed.appearance.theme_id, "dark");
        assert_eq!(parsed.appearance.code_font, "jetbrains-mono");
        assert_eq!(parsed.appearance.code_ligatures, "standard");
    }

    /// Round-tripping the default value preserves all fields, so we don't
    /// silently lose data on save → load.
    #[test]
    fn default_round_trips_through_json() {
        let original = AppSettings::default();
        let json = serde_json::to_string(&original).expect("serialize");
        let parsed: AppSettings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(original.theme, parsed.theme);
        assert_eq!(
            original.commit_message_template,
            parsed.commit_message_template
        );
    }

    #[test]
    fn git_config_override_round_trips_and_defaults_empty() {
        let s = AppSettings::default();
        assert!(s.git_config_override.user_name.is_none());
        assert!(s.git_config_override.user_email.is_none());

        let json = serde_json::to_string(&s).expect("serialize");
        assert!(json.contains("gitConfigOverride"));
        let back: AppSettings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.git_config_override.user_name, None);
    }

    /// Settings carrying the historical "glassy" theme id must migrate to
    /// `theme_id = "dark"` plus `translucency.enabled = true` so the user's
    /// prior intent ("translucent dark window") is preserved while the theme
    /// slot becomes orthogonal again.
    #[test]
    fn glassy_theme_id_migrates_to_dark_plus_translucency() {
        let mut appearance = AppearanceSettings {
            theme_id: "glassy".into(),
            ..AppearanceSettings::default()
        };
        let changed = appearance.migrate_legacy();
        assert!(changed, "glassy must trigger a rewrite");
        assert_eq!(appearance.theme_id, "dark");
        assert!(appearance.translucency.enabled);
        assert_eq!(appearance.translucency.intensity, default_translucency_intensity());
    }

    #[test]
    fn non_glassy_theme_id_is_left_alone_by_migration() {
        let mut appearance = AppearanceSettings {
            theme_id: "dark".into(),
            ..AppearanceSettings::default()
        };
        let changed = appearance.migrate_legacy();
        assert!(!changed);
        assert_eq!(appearance.theme_id, "dark");
        assert!(!appearance.translucency.enabled);
    }

    /// The retired `oled` variant migrates to `dark` so users who picked
    /// it pre-retirement keep loading a valid theme id (and don't get
    /// silently flipped to light by the renderer's fallback path).
    #[test]
    fn oled_theme_id_migrates_to_dark() {
        let mut appearance = AppearanceSettings {
            theme_id: "oled".into(),
            ..AppearanceSettings::default()
        };
        let changed = appearance.migrate_legacy();
        assert!(changed, "oled must trigger a rewrite");
        assert_eq!(appearance.theme_id, "dark");
        // OLED never carried translucency, so the flag stays at its default.
        assert!(!appearance.translucency.enabled);
    }

    /// Translucency block must round-trip through JSON and ship the new
    /// camelCase keys when serialised.
    #[test]
    fn translucency_round_trips_with_camel_case_keys() {
        let mut s = AppSettings::default();
        s.appearance.translucency = TranslucencySettings {
            enabled: true,
            intensity: 42,
            blur_intensity: 17,
        };
        let json = serde_json::to_string(&s).expect("serialize");
        assert!(json.contains("\"translucency\""));
        assert!(json.contains("\"intensity\":42"));
        assert!(json.contains("\"blurIntensity\":17"));
        let back: AppSettings = serde_json::from_str(&json).expect("deserialize");
        assert!(back.appearance.translucency.enabled);
        assert_eq!(back.appearance.translucency.blur_intensity, 17);
        assert_eq!(back.appearance.translucency.intensity, 42);
    }

    /// Settings written before the locale-prefs split (no `localePrefs` key)
    /// must fall back to renderer defaults rather than failing to parse.
    #[test]
    fn legacy_appearance_without_locale_prefs_loads_default() {
        let legacy = r#"{
            "appearance": {
                "themeId": "dark",
                "followsSystem": false,
                "primaryColor": "blue",
                "font": "inter",
                "codeFont": "jetbrains-mono",
                "codeLigatures": "standard",
                "fontSize": "md"
            }
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).expect("legacy appearance json");
        assert_eq!(parsed.appearance.locale_prefs.date_format, "relative");
        assert_eq!(parsed.appearance.locale_prefs.time_format, "24h");
        assert_eq!(parsed.appearance.locale_prefs.week_start, "monday");
        assert!(parsed.appearance.locale_prefs.region.is_none());
    }

    /// `localePrefs` block round-trips through JSON and carries the new
    /// camelCase keys when serialised.
    #[test]
    fn locale_prefs_round_trip_with_camel_case_keys() {
        let mut s = AppSettings::default();
        s.appearance.locale_prefs = LocaleSettings {
            date_format: "absolute".into(),
            time_format: "12h".into(),
            week_start: "sunday".into(),
            region: Some("GB".into()),
        };
        let json = serde_json::to_string(&s).expect("serialize");
        assert!(json.contains("\"localePrefs\""));
        assert!(json.contains("\"dateFormat\":\"absolute\""));
        assert!(json.contains("\"timeFormat\":\"12h\""));
        assert!(json.contains("\"weekStart\":\"sunday\""));
        assert!(json.contains("\"region\":\"GB\""));
        let back: AppSettings = serde_json::from_str(&json).expect("deserialize");
        assert_eq!(back.appearance.locale_prefs.date_format, "absolute");
        assert_eq!(back.appearance.locale_prefs.region.as_deref(), Some("GB"));
    }

    /// Settings written before the translucency split (no `translucency` key)
    /// must fall back to defaults rather than failing to parse.
    #[test]
    fn legacy_appearance_without_translucency_loads_default() {
        let legacy = r#"{
            "appearance": {
                "themeId": "dark",
                "followsSystem": false,
                "primaryColor": "blue",
                "font": "inter",
                "codeFont": "jetbrains-mono",
                "codeLigatures": "standard",
                "fontSize": "md"
            }
        }"#;
        let parsed: AppSettings = serde_json::from_str(legacy).expect("legacy appearance json");
        assert_eq!(parsed.appearance.theme_id, "dark");
        assert!(!parsed.appearance.translucency.enabled);
        assert_eq!(parsed.appearance.translucency.intensity, default_translucency_intensity());
    }

    /// Legacy `RepoRecord` (no `sshKeyPath`) still loads.
    #[test]
    fn legacy_repo_record_loads_without_ssh_key_path() {
        let legacy = r#"{
            "id": "abc",
            "name": "demo",
            "path": "/tmp/demo",
            "groupId": null,
            "remoteUrl": null,
            "providerId": null
        }"#;
        let parsed: RepoRecord = serde_json::from_str(legacy).expect("legacy record");
        assert_eq!(parsed.id, "abc");
        assert!(parsed.ssh_key_path.is_none());
    }
}

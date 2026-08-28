export const APP_NAME = "Recrest";

// The INTERNAL identifier — Tauri's `identifier`, and therefore the name of the
// per-user data directory (`app_config_dir()` / `app_data_dir()`) and of the
// keychain service that holds provider tokens.
//
// It deliberately differs from the app's PUBLIC AppStream id,
// `com.soft_ventures.Recrest` (metainfo, desktop file, Flatpak). Those are two
// separate namespaces and only the public one has to reverse a domain we own.
// Aligning them would rename this directory and orphan every existing install's
// settings and tokens, which is not worth doing for cosmetic symmetry. See
// packaging/flatpak/README.md.
export const APP_IDENTIFIER = "eu.softventures.recrest";
// The marker must sit on the SAME line as the value: release-please's Generic
// updater only rewrites the line the marker is on. With it one line above, this
// constant was silently never bumped.
export const APP_VERSION = "0.12.1"; // x-release-please-version

export const URLS = {
  homepage: "https://github.com/softventures/recrest",
  issues: "https://github.com/softventures/recrest/issues",
  docs: "https://github.com/softventures/recrest#readme",
} as const;

export const MIN_WINDOW_WIDTH = 1100;
export const MIN_WINDOW_HEIGHT = 720;
export const DEFAULT_WINDOW_WIDTH = 1280;
export const DEFAULT_WINDOW_HEIGHT = 800;
export const WINDOW_STATE_DEBOUNCE_MS = 500;
export const UPDATER_INITIAL_DELAY_MS = 10_000;
export const UPDATER_INTERVAL_MS = 4 * 60 * 60 * 1000;
export const TITLEBAR_HEIGHT_PX = 40;

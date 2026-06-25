/**
 * Live snapshot of host-system facts surfaced by the Settings → System panel.
 * Mirrors the `commands::system::SystemFacts` Rust DTO
 * (`#[serde(rename_all = "camelCase")]`) returned by `get_system_facts`.
 */
export interface SystemFacts {
  os: string;
  arch: string;
  osVersion?: string;
  gitVersion?: string;
  appVersion: string;
}

/**
 * Real on-disk byte counts for Recrest's own data, surfaced in
 * Settings → Data & Cache. Mirrors the `commands::system::DataSizes` Rust DTO.
 * All three fields are best-effort: a missing file/dir reports 0.
 */
export interface DataSizes {
  settingsBytes: number;
  cacheBytes: number;
  tokensBytes: number;
}

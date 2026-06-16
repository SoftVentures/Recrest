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

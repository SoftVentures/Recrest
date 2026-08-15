import type { InstallChannel } from "../types/updater.js";

/** Every install channel the Rust backend can report. Frozen list backing both
 *  type-narrowing and the payload validation in `useUpdaterEvents`. */
export const INSTALL_CHANNELS = [
  "appImage",
  "flatpak",
  "snap",
  "systemPackage",
  "bundle",
  "unknown",
] as const satisfies readonly InstallChannel[];

/** Channels where an external package manager owns updates, so the in-app
 *  updater must inform but never install. Mirrors
 *  `InstallChannel::is_package_managed` in `update/channel.rs`. */
export const PACKAGE_MANAGED_INSTALL_CHANNELS = [
  "flatpak",
  "snap",
  "systemPackage",
] as const satisfies readonly InstallChannel[];

export type PackageManagedInstallChannel = (typeof PACKAGE_MANAGED_INSTALL_CHANNELS)[number];

export function isInstallChannel(value: unknown): value is InstallChannel {
  return typeof value === "string" && (INSTALL_CHANNELS as readonly string[]).includes(value);
}

export function isPackageManagedInstallChannel(
  value: InstallChannel | null | undefined,
): value is PackageManagedInstallChannel {
  return (
    value !== null &&
    value !== undefined &&
    (PACKAGE_MANAGED_INSTALL_CHANNELS as readonly string[]).includes(value)
  );
}

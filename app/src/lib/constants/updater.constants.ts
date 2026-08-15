import {
  INSTALL_CHANNELS,
  type InstallChannel,
  PACKAGE_MANAGED_INSTALL_CHANNELS,
  type PackageManagedInstallChannel,
  isInstallChannel,
  isPackageManagedInstallChannel,
} from "@recrest/shared";

export {
  INSTALL_CHANNELS,
  type InstallChannel,
  isInstallChannel,
  isPackageManagedInstallChannel,
  PACKAGE_MANAGED_INSTALL_CHANNELS,
  type PackageManagedInstallChannel,
};

/** Named-constant accessors for the install channels the backend reports. Use
 *  these instead of bare string literals — e.g.
 *  `INSTALL_CHANNEL.SYSTEM_PACKAGE`, not `"systemPackage"`. */
export const INSTALL_CHANNEL = {
  APP_IMAGE: "appImage",
  FLATPAK: "flatpak",
  SNAP: "snap",
  SYSTEM_PACKAGE: "systemPackage",
  BUNDLE: "bundle",
  UNKNOWN: "unknown",
} as const satisfies Record<string, InstallChannel>;

/** i18n key (namespace `common`) for the banner hint shown instead of the
 *  install button when an external package manager owns updates. */
export const UPDATER_CHANNEL_HINT_KEYS = {
  systemPackage: "updater.channel_hint_system_package",
  flatpak: "updater.channel_hint_flatpak",
  snap: "updater.channel_hint_snap",
} as const satisfies Record<PackageManagedInstallChannel, `updater.channel_hint_${string}`>;

import { describe, expect, it } from "vitest";

import {
  INSTALL_CHANNELS,
  PACKAGE_MANAGED_INSTALL_CHANNELS,
  isInstallChannel,
  isPackageManagedInstallChannel,
} from "./updater.js";

describe("install channels", () => {
  it("keeps every package-managed channel inside the full channel list", () => {
    for (const channel of PACKAGE_MANAGED_INSTALL_CHANNELS) {
      expect(INSTALL_CHANNELS).toContain(channel);
    }
  });

  it("treats the self-updating channels as installable", () => {
    expect(isPackageManagedInstallChannel("appImage")).toBe(false);
    expect(isPackageManagedInstallChannel("bundle")).toBe(false);
    // Unknown is not self-updating either, but it is nobody's package manager,
    // so it must not trigger the "use your package manager" hint.
    expect(isPackageManagedInstallChannel("unknown")).toBe(false);
    expect(isPackageManagedInstallChannel(null)).toBe(false);
    expect(isPackageManagedInstallChannel(undefined)).toBe(false);
  });

  it("flags the distro/container channels", () => {
    expect(isPackageManagedInstallChannel("systemPackage")).toBe(true);
    expect(isPackageManagedInstallChannel("flatpak")).toBe(true);
    expect(isPackageManagedInstallChannel("snap")).toBe(true);
  });

  it("guards unknown payload values", () => {
    for (const channel of INSTALL_CHANNELS) expect(isInstallChannel(channel)).toBe(true);
    expect(isInstallChannel("deb")).toBe(false);
    expect(isInstallChannel("")).toBe(false);
    expect(isInstallChannel(undefined)).toBe(false);
    expect(isInstallChannel(42)).toBe(false);
  });
});

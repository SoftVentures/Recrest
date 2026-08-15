import { describe, expect, it } from "vitest";

import {
  PACKAGE_MANAGED_INSTALL_CHANNELS,
  UPDATER_CHANNEL_HINT_KEYS,
} from "@/lib/constants/updater.constants";
import commonDe from "@/locales/de/common.json";
import commonEn from "@/locales/en/common.json";

describe("updater channel constants", () => {
  it("covers every package-managed channel with a hint key", () => {
    expect(Object.keys(UPDATER_CHANNEL_HINT_KEYS).sort()).toEqual(
      [...PACKAGE_MANAGED_INSTALL_CHANNELS].sort(),
    );
  });

  it("resolves every hint key in both locale bundles", () => {
    const bundles = { en: commonEn, de: commonDe } as const;
    for (const channel of PACKAGE_MANAGED_INSTALL_CHANNELS) {
      const key = UPDATER_CHANNEL_HINT_KEYS[channel];
      const leaf = key.slice("updater.".length);
      for (const [locale, bundle] of Object.entries(bundles)) {
        const value = (bundle.updater as Record<string, string | undefined>)[leaf];
        expect(value, `${locale}: ${key} must exist`).toBeTruthy();
      }
    }
  });
});

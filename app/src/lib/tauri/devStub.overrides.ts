import type { ThemeId } from "@/lib/constants/theme.constants";
import type { AppSeed } from "@/lib/dev/seed";

export interface DevSeedOverrides {
  /** Boot the seeded app in this theme (pins `followsSystem` off so the
   *  landingpage toggle, not the visitor's OS, controls the demo). */
  themeId?: ThemeId;
}

export function applySeedOverrides(
  seed: Required<AppSeed>,
  overrides?: DevSeedOverrides,
): Required<AppSeed> {
  if (!overrides?.themeId) return seed;
  return {
    ...seed,
    settings: {
      ...seed.settings,
      appearance: {
        ...seed.settings.appearance,
        themeId: overrides.themeId,
        followsSystem: false,
      },
    },
  };
}

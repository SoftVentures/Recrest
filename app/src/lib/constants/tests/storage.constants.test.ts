import { describe, expect, it } from "vitest";

import {
  CONFIRM_SKIP_PREFIX,
  LOGO_KEY_PREFIX,
  NOTIF_KEY_PREFIX,
  SCROLL_KEY_PREFIX,
  STORAGE_PREFIX,
  StorageKey,
  storageKeyForConfirmSkip,
  storageKeyForLogo,
  storageKeyForScroll,
} from "@/lib/constants/storage.constants";

describe("storage-key constants", () => {
  it("every storage key starts with the shared recrest: prefix", () => {
    expect(STORAGE_PREFIX).toBe("recrest:");
    for (const value of Object.values(StorageKey)) {
      expect(value.startsWith(STORAGE_PREFIX)).toBe(true);
    }
  });

  it("every prefix is well-formed and reaches into the recrest: namespace", () => {
    for (const prefix of [
      CONFIRM_SKIP_PREFIX,
      LOGO_KEY_PREFIX,
      SCROLL_KEY_PREFIX,
      NOTIF_KEY_PREFIX,
    ]) {
      expect(prefix.startsWith(STORAGE_PREFIX)).toBe(true);
    }
  });

  it("generators concatenate the prefix and the runtime token", () => {
    expect(storageKeyForConfirmSkip("delete-repo")).toBe(`${CONFIRM_SKIP_PREFIX}delete-repo`);
    expect(storageKeyForLogo("repo-42")).toBe(`${LOGO_KEY_PREFIX}repo-42`);
    expect(storageKeyForScroll("/activity")).toBe(`${SCROLL_KEY_PREFIX}/activity`);
  });

  it("THEME / THEME_FOLLOWS_SYSTEM literals match the anti-flash inline script", () => {
    // The inline `<script>` in app/index.html reads these exact keys before
    // any module loads. Drifting these constants without updating the
    // inline script would re-introduce the boot-time theme flash.
    expect(StorageKey.THEME).toBe("recrest:theme");
    expect(StorageKey.THEME_FOLLOWS_SYSTEM).toBe("recrest:theme-follows-system");
  });
});

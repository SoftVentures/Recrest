import { EventChannel, StorageKey } from "@recrest/shared";

import { describe, expect, it, vi } from "vitest";

import { DEFAULT_SEED } from "@/lib/dev/seed";
import { systemStub } from "@/lib/tauri/devStub.handlers.system";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, createDevStubState } from "@/lib/tauri/devStub.state";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx() {
  return { emit: vi.fn() };
}

function makeState() {
  return createDevStubState(DEFAULT_SEED as unknown as DevSeed);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("systemStub", () => {
  describe("notify", () => {
    it("returns undefined", () => {
      const result = systemStub("notify", {}, makeState(), makeCtx());
      expect(result).toBeUndefined();
    });
  });

  describe("begin_oauth", () => {
    it("returns an object with state and supportsOauth:true", () => {
      vi.useFakeTimers();
      const ctx = makeCtx();
      const result = systemStub("begin_oauth", {}, makeState(), ctx) as Record<string, unknown>;
      expect(result).toMatchObject({ state: "stub-state", supportsOauth: true });
      vi.useRealTimers();
    });

    it("schedules an emit via setTimeout", () => {
      vi.useFakeTimers();
      const ctx = makeCtx();
      systemStub("begin_oauth", {}, makeState(), ctx);
      expect(ctx.emit).not.toHaveBeenCalled();
      vi.advanceTimersByTime(500);
      expect(ctx.emit).toHaveBeenCalledOnce();
      const [event, payload] = ctx.emit.mock.calls[0] as [string, { url: string }];
      expect(event).toBe(EventChannel.OAUTH_CALLBACK);
      // eslint-disable-next-line no-restricted-syntax -- "recrest://oauth/callback" is the OAuth redirect URI scheme, not a storage key; no constant exists for it
      expect(payload.url).toContain("recrest://oauth/callback");
      expect(payload.url).toContain("code=stub-code");
      expect(payload.url).toContain("state=stub-state");
      vi.useRealTimers();
    });
  });

  describe("complete_oauth", () => {
    it("returns undefined", () => {
      const state = makeState();
      const result = systemStub("complete_oauth", { providerId: "github" }, state, makeCtx());
      expect(result).toBeUndefined();
    });

    it("sets connected:true on a known provider", () => {
      const state = makeState();
      // Grab the first provider key from the seed
      const providers = state.seed.providers as Record<string, Record<string, unknown>>;
      const [providerId] = Object.keys(providers);
      systemStub("complete_oauth", { providerId }, state, makeCtx());
      const updated = (state.seed.providers as Record<string, Record<string, unknown>>)[
        providerId!
      ];
      expect(updated).toBeDefined();
      expect(updated!["connected"]).toBe(true);
    });

    it("is a no-op for an unknown provider", () => {
      const state = makeState();
      const before = JSON.stringify(state.seed.providers);
      systemStub("complete_oauth", { providerId: "does-not-exist" }, state, makeCtx());
      // Providers object still has the same top-level keys (unknown key is ignored)
      expect(Object.keys(state.seed.providers as object)).toEqual(
        Object.keys(JSON.parse(before) as object),
      );
    });
  });

  describe("get_settings", () => {
    it("returns an object", () => {
      const result = systemStub("get_settings", {}, makeState(), makeCtx());
      expect(result).toBeTypeOf("object");
      expect(result).not.toBeNull();
    });

    it("overlays localStorage when valid JSON is stored", () => {
      const state = makeState();
      const patch = { testKey: "testValue" };
      localStorage.setItem(StorageKey.DEV_SETTINGS, JSON.stringify(patch));
      const result = systemStub("get_settings", {}, state, makeCtx()) as Record<string, unknown>;
      expect(result["testKey"]).toBe("testValue");
      localStorage.removeItem(StorageKey.DEV_SETTINGS);
    });

    it("falls back to seed when localStorage contains corrupt JSON", () => {
      const state = makeState();
      localStorage.setItem(StorageKey.DEV_SETTINGS, "{{not json}}");
      // Should not throw and returns the seed settings
      const result = systemStub("get_settings", {}, state, makeCtx());
      expect(result).toBeDefined();
      localStorage.removeItem(StorageKey.DEV_SETTINGS);
    });
  });

  describe("update_settings", () => {
    it("returns the merged settings object", () => {
      const state = makeState();
      const result = systemStub("update_settings", { patch: { accent: "blue" } }, state, makeCtx());
      expect(result).toBeTypeOf("object");
      expect((result as Record<string, unknown>)["accent"]).toBe("blue");
    });

    it("persists the merged settings into seed.settings", () => {
      const state = makeState();
      systemStub("update_settings", { patch: { myProp: 42 } }, state, makeCtx());
      expect((state.seed.settings as Record<string, unknown>)["myProp"]).toBe(42);
    });

    it("merges without clobbering other keys", () => {
      const state = makeState();
      const before = state.seed.settings as Record<string, unknown>;
      const existingKey = Object.keys(before)[0];
      const existingVal = existingKey != null ? before[existingKey] : undefined;
      systemStub("update_settings", { patch: { brand_new: "val" } }, state, makeCtx());
      const after = state.seed.settings as Record<string, unknown>;
      if (existingKey != null) {
        expect(after[existingKey]).toEqual(existingVal);
      }
      expect(after["brand_new"]).toBe("val");
    });

    it("handles missing patch gracefully (defaults to {})", () => {
      const state = makeState();
      const result = systemStub("update_settings", {}, state, makeCtx());
      expect(result).toBeTypeOf("object");
    });
  });

  describe("list_custom_fonts", () => {
    it("returns an empty array", () => {
      expect(systemStub("list_custom_fonts", {}, makeState(), makeCtx())).toEqual([]);
    });
  });

  describe("upload_font", () => {
    it("returns undefined", () => {
      expect(systemStub("upload_font", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("delete_custom_font", () => {
    it("returns undefined", () => {
      expect(systemStub("delete_custom_font", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("get_platform_info", () => {
    it("returns an object with required shape", () => {
      const result = systemStub("get_platform_info", {}, makeState(), makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result).toMatchObject({
        arch: "x86_64",
        debugAssertions: true,
      });
      expect(["macos", "linux", "windows"]).toContain(result["os"]);
      expect(result["version"]).toBeTypeOf("string");
      expect(["windows", "unix"]).toContain(result["family"]);
    });
  });

  describe("get_system_facts", () => {
    it("returns browser-mode facts with os:web and arch:browser", () => {
      const result = systemStub("get_system_facts", {}, makeState(), makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result["os"]).toBe("web");
      expect(result["arch"]).toBe("browser");
      expect(result["osVersion"]).toBeUndefined();
      expect(result["gitVersion"]).toBeUndefined();
    });

    it("returns a string appVersion matching __APP_VERSION__", () => {
      const result = systemStub("get_system_facts", {}, makeState(), makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result["appVersion"]).toBeTypeOf("string");
      expect(result["appVersion"]).toBe("0.0.0-test");
    });
  });

  describe("get_data_sizes", () => {
    it("returns numeric byte counts for settings, cache, tokens", () => {
      const result = systemStub("get_data_sizes", {}, makeState(), makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result["settingsBytes"]).toBeTypeOf("number");
      expect(result["cacheBytes"]).toBeTypeOf("number");
      expect(result["tokensBytes"]).toBeTypeOf("number");
      expect((result["settingsBytes"] as number) > 0).toBe(true);
    });
  });

  describe("detect_terminals", () => {
    it("returns an empty array", () => {
      expect(systemStub("detect_terminals", {}, makeState(), makeCtx())).toEqual([]);
    });
  });

  describe("detect_shells", () => {
    it("returns an empty array", () => {
      expect(systemStub("detect_shells", {}, makeState(), makeCtx())).toEqual([]);
    });
  });

  describe("list_terminals", () => {
    it("returns an array", () => {
      const result = systemStub("list_terminals", {}, makeState(), makeCtx());
      expect(Array.isArray(result)).toBe(true);
    });

    it("returns windows terminal entry when UA is windows", () => {
      // jsdom's user agent doesn't contain Mac or Linux patterns, so detectPlatform returns "windows"
      const result = systemStub("list_terminals", {}, makeState(), makeCtx()) as Array<
        Record<string, unknown>
      >;
      // In jsdom (windows fallback): returns the Windows Terminal entry
      if (result.length > 0) {
        const terminal = result[0]!;
        expect(terminal["kind"]).toBe("terminal");
        expect(terminal["id"]).toBeTypeOf("string");
        expect(terminal["displayName"]).toBeTypeOf("string");
        expect(terminal["launchCommand"]).toBeDefined();
      }
    });
  });

  describe("list_ides", () => {
    it("returns an array", () => {
      const result = systemStub("list_ides", {}, makeState(), makeCtx());
      expect(Array.isArray(result)).toBe(true);
    });

    it("each entry has kind:ide, id, displayName and launchCommand", () => {
      const result = systemStub("list_ides", {}, makeState(), makeCtx()) as Array<
        Record<string, unknown>
      >;
      for (const entry of result) {
        expect(entry["kind"]).toBe("ide");
        expect(entry["id"]).toBeTypeOf("string");
        expect(entry["displayName"]).toBeTypeOf("string");
        expect(entry["launchCommand"]).toBeDefined();
      }
    });
  });

  describe("test_custom_terminal", () => {
    it("returns undefined", () => {
      expect(systemStub("test_custom_terminal", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("check_git", () => {
    it("returns installed:true and a version string", () => {
      const result = systemStub("check_git", {}, makeState(), makeCtx()) as Record<string, unknown>;
      expect(result["installed"]).toBe(true);
      expect(result["version"]).toBeTypeOf("string");
    });
  });

  describe("get_system_dark_mode", () => {
    it("returns null", () => {
      expect(systemStub("get_system_dark_mode", {}, makeState(), makeCtx())).toBeNull();
    });
  });

  describe("update_tray_badge", () => {
    it("returns undefined", () => {
      expect(systemStub("update_tray_badge", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("check_for_update", () => {
    it("returns undefined", () => {
      expect(systemStub("check_for_update", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("install_update", () => {
    it("returns undefined", () => {
      expect(systemStub("install_update", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("get_dev_paths", () => {
    it("returns an object with four path strings", () => {
      const result = systemStub("get_dev_paths", {}, makeState(), makeCtx()) as Record<
        string,
        unknown
      >;
      expect(result["configDir"]).toBeTypeOf("string");
      expect(result["dataDir"]).toBeTypeOf("string");
      expect(result["cacheDir"]).toBeTypeOf("string");
      expect(result["logDir"]).toBeTypeOf("string");
    });
  });

  describe("get_build_triple", () => {
    it("returns a non-empty string", () => {
      const result = systemStub("get_build_triple", {}, makeState(), makeCtx());
      expect(result).toBeTypeOf("string");
      expect((result as string).length).toBeGreaterThan(0);
    });

    it("includes the architecture suffix", () => {
      const result = systemStub("get_build_triple", {}, makeState(), makeCtx()) as string;
      expect(result).toContain("x86_64");
    });
  });

  describe("dev_panic", () => {
    it("returns undefined", () => {
      expect(systemStub("dev_panic", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("dev_log", () => {
    it("returns undefined (no infinite-loop risk)", () => {
      expect(systemStub("dev_log", {}, makeState(), makeCtx())).toBeUndefined();
    });
  });

  describe("unknown command", () => {
    it("returns UNHANDLED for an unrecognised command", () => {
      expect(systemStub("this_command_does_not_exist", {}, makeState(), makeCtx())).toBe(UNHANDLED);
    });
  });
});

import { describe, expect, it, vi } from "vitest";

import { type PluginStubCtx, pluginStub } from "@/lib/tauri/devStub.handlers.plugins";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(): PluginStubCtx {
  return {
    registerListener: vi.fn(() => 1),
    bindEventListener: vi.fn(),
    unregisterListener: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pluginStub", () => {
  // -------------------------------------------------------------------------
  // plugin:event
  // -------------------------------------------------------------------------
  describe("plugin:event|listen", () => {
    it("binds the listener and returns the handler id when event+handler are provided", () => {
      const ctx = makeCtx();
      const result = pluginStub("plugin:event|listen", { event: "my-event", handler: 42 }, ctx);
      expect(ctx.bindEventListener).toHaveBeenCalledWith("my-event", 42);
      expect(result).toBe(42);
    });

    it("falls back to registerListener when handler is not a number", () => {
      const ctx = makeCtx();
      const result = pluginStub(
        "plugin:event|listen",
        { event: "my-event", handler: "not-a-number" },
        ctx,
      );
      expect(ctx.registerListener).toHaveBeenCalledOnce();
      expect(ctx.bindEventListener).not.toHaveBeenCalled();
      expect(result).toBe(1);
    });

    it("falls back to registerListener when event is missing", () => {
      const ctx = makeCtx();
      pluginStub("plugin:event|listen", { handler: 42 }, ctx);
      expect(ctx.registerListener).toHaveBeenCalledOnce();
      expect(ctx.bindEventListener).not.toHaveBeenCalled();
    });

    it("falls back to registerListener when both event and handler are missing", () => {
      const ctx = makeCtx();
      pluginStub("plugin:event|listen", {}, ctx);
      expect(ctx.registerListener).toHaveBeenCalledOnce();
    });
  });

  describe("plugin:event|unlisten", () => {
    it("calls unregisterListener with the numeric eventId", () => {
      const ctx = makeCtx();
      const result = pluginStub("plugin:event|unlisten", { eventId: 99 }, ctx);
      expect(ctx.unregisterListener).toHaveBeenCalledWith(99);
      expect(result).toBeUndefined();
    });

    it("does NOT call unregisterListener when eventId is not a number", () => {
      const ctx = makeCtx();
      pluginStub("plugin:event|unlisten", { eventId: "not-a-number" }, ctx);
      expect(ctx.unregisterListener).not.toHaveBeenCalled();
    });

    it("does NOT call unregisterListener when eventId is absent", () => {
      const ctx = makeCtx();
      pluginStub("plugin:event|unlisten", {}, ctx);
      expect(ctx.unregisterListener).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:window — boolean queries
  // -------------------------------------------------------------------------
  describe("plugin:window boolean queries", () => {
    const boolCmds = [
      "plugin:window|is_maximized",
      "plugin:window|is_minimized",
      "plugin:window|is_fullscreen",
      "plugin:window|is_focused",
    ] as const;

    for (const cmd of boolCmds) {
      it(`${cmd} returns false`, () => {
        expect(pluginStub(cmd, {}, makeCtx())).toBe(false);
      });
    }
  });

  // -------------------------------------------------------------------------
  // plugin:window — void mutations
  // -------------------------------------------------------------------------
  describe("plugin:window void mutations", () => {
    const voidCmds = [
      "plugin:window|minimize",
      "plugin:window|maximize",
      "plugin:window|unmaximize",
      "plugin:window|close",
      "plugin:window|set_title",
      "plugin:window|start_dragging",
      "plugin:window|set_size",
      "plugin:window|set_position",
      "plugin:window|set_min_size",
      "plugin:window|set_max_size",
      "set_caption_button_bounds",
    ] as const;

    for (const cmd of voidCmds) {
      it(`${cmd} returns undefined`, () => {
        expect(pluginStub(cmd, {}, makeCtx())).toBeUndefined();
      });
    }
  });

  // -------------------------------------------------------------------------
  // plugin:window — window identity
  // -------------------------------------------------------------------------
  describe("plugin:window|current_window", () => {
    it("returns { label: 'main' }", () => {
      expect(pluginStub("plugin:window|current_window", {}, makeCtx())).toEqual({ label: "main" });
    });
  });

  describe("plugin:window|get_current", () => {
    it("returns { label: 'main' }", () => {
      expect(pluginStub("plugin:window|get_current", {}, makeCtx())).toEqual({ label: "main" });
    });
  });

  describe("plugin:window|scale_factor", () => {
    it("returns 1", () => {
      expect(pluginStub("plugin:window|scale_factor", {}, makeCtx())).toBe(1);
    });
  });

  describe("plugin:window size/position queries", () => {
    it("inner_size returns { width: 1440, height: 900 }", () => {
      expect(pluginStub("plugin:window|inner_size", {}, makeCtx())).toEqual({
        width: 1440,
        height: 900,
      });
    });

    it("outer_size returns { width: 1440, height: 900 }", () => {
      expect(pluginStub("plugin:window|outer_size", {}, makeCtx())).toEqual({
        width: 1440,
        height: 900,
      });
    });

    it("inner_position returns { x: 0, y: 0 }", () => {
      expect(pluginStub("plugin:window|inner_position", {}, makeCtx())).toEqual({ x: 0, y: 0 });
    });

    it("outer_position returns { x: 0, y: 0 }", () => {
      expect(pluginStub("plugin:window|outer_position", {}, makeCtx())).toEqual({ x: 0, y: 0 });
    });
  });

  // -------------------------------------------------------------------------
  // plugin:os
  // -------------------------------------------------------------------------
  describe("plugin:os|platform", () => {
    it("returns one of the three platform literals", () => {
      const result = pluginStub("plugin:os|platform", {}, makeCtx());
      expect(["macos", "linux", "windows"]).toContain(result);
    });
  });

  describe("plugin:os|type", () => {
    it("returns the OS type string corresponding to the detected platform", () => {
      const result = pluginStub("plugin:os|type", {}, makeCtx());
      expect(["Darwin", "Linux", "Windows_NT"]).toContain(result);
    });
  });

  describe("plugin:os|version", () => {
    it("returns a string", () => {
      expect(pluginStub("plugin:os|version", {}, makeCtx())).toBeTypeOf("string");
    });
  });

  describe("plugin:os|arch", () => {
    it("returns 'x86_64'", () => {
      expect(pluginStub("plugin:os|arch", {}, makeCtx())).toBe("x86_64");
    });
  });

  describe("plugin:os|locale", () => {
    it("returns a non-empty string", () => {
      const result = pluginStub("plugin:os|locale", {}, makeCtx());
      expect(result).toBeTypeOf("string");
      expect((result as string).length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // plugin:opener / plugin:shell
  // -------------------------------------------------------------------------
  describe("plugin:opener|open_url", () => {
    it("returns undefined", () => {
      expect(
        pluginStub("plugin:opener|open_url", { url: "https://example.com" }, makeCtx()),
      ).toBeUndefined();
    });
  });

  describe("plugin:opener|open_path", () => {
    it("returns undefined", () => {
      expect(
        pluginStub("plugin:opener|open_path", { path: "/tmp/foo" }, makeCtx()),
      ).toBeUndefined();
    });
  });

  describe("plugin:shell|open", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:shell|open", { path: "/tmp/foo" }, makeCtx())).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:store
  // -------------------------------------------------------------------------
  describe("plugin:store commands", () => {
    const storeCmds = [
      "plugin:store|load",
      "plugin:store|get",
      "plugin:store|set",
      "plugin:store|save",
      "plugin:store|delete",
      "plugin:store|clear",
      "plugin:store|length",
      "plugin:store|entries",
      "plugin:store|keys",
      "plugin:store|values",
      "plugin:store|has",
    ] as const;

    for (const cmd of storeCmds) {
      it(`${cmd} returns null`, () => {
        expect(pluginStub(cmd, {}, makeCtx())).toBeNull();
      });
    }
  });

  // -------------------------------------------------------------------------
  // plugin:app
  // -------------------------------------------------------------------------
  describe("plugin:app|version", () => {
    it("returns the __APP_VERSION__ string", () => {
      const result = pluginStub("plugin:app|version", {}, makeCtx());
      expect(result).toBeTypeOf("string");
      expect(result).toBe("0.0.0-test");
    });
  });

  describe("plugin:app|name", () => {
    it("returns 'Recrest'", () => {
      expect(pluginStub("plugin:app|name", {}, makeCtx())).toBe("Recrest");
    });
  });

  describe("plugin:app|tauri_version", () => {
    it("returns a version string", () => {
      const result = pluginStub("plugin:app|tauri_version", {}, makeCtx());
      expect(result).toBeTypeOf("string");
      expect(result).toBe("2.0.0");
    });
  });

  // -------------------------------------------------------------------------
  // plugin:notification
  // -------------------------------------------------------------------------
  describe("plugin:notification|is_permission_granted", () => {
    it("returns true", () => {
      expect(pluginStub("plugin:notification|is_permission_granted", {}, makeCtx())).toBe(true);
    });
  });

  describe("plugin:notification|request_permission", () => {
    it("returns 'granted'", () => {
      expect(pluginStub("plugin:notification|request_permission", {}, makeCtx())).toBe("granted");
    });
  });

  describe("plugin:notification|notify", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:notification|notify", { title: "Hi" }, makeCtx())).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:dialog
  // -------------------------------------------------------------------------
  describe("plugin:dialog|open", () => {
    it("returns null (no file selected)", () => {
      expect(pluginStub("plugin:dialog|open", {}, makeCtx())).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:autostart
  // -------------------------------------------------------------------------
  describe("plugin:autostart|is_enabled", () => {
    it("returns false", () => {
      expect(pluginStub("plugin:autostart|is_enabled", {}, makeCtx())).toBe(false);
    });
  });

  describe("plugin:autostart|enable", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:autostart|enable", {}, makeCtx())).toBeUndefined();
    });
  });

  describe("plugin:autostart|disable", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:autostart|disable", {}, makeCtx())).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:process
  // -------------------------------------------------------------------------
  describe("plugin:process|relaunch", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:process|relaunch", {}, makeCtx())).toBeUndefined();
    });
  });

  describe("plugin:process|exit", () => {
    it("returns undefined", () => {
      expect(pluginStub("plugin:process|exit", { code: 0 }, makeCtx())).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // plugin:updater
  // -------------------------------------------------------------------------
  describe("plugin:updater|check", () => {
    it("returns { available: false }", () => {
      expect(pluginStub("plugin:updater|check", {}, makeCtx())).toEqual({ available: false });
    });
  });

  // -------------------------------------------------------------------------
  // plugin:deep-link
  // -------------------------------------------------------------------------
  describe("plugin:deep-link|get_current", () => {
    it("returns null", () => {
      expect(pluginStub("plugin:deep-link|get_current", {}, makeCtx())).toBeNull();
    });
  });

  describe("plugin:deep-link|register", () => {
    it("returns undefined", () => {
      expect(
        pluginStub("plugin:deep-link|register", { protocol: "recrest" }, makeCtx()),
      ).toBeUndefined();
    });
  });

  describe("plugin:deep-link|unregister", () => {
    it("returns undefined", () => {
      expect(
        pluginStub("plugin:deep-link|unregister", { protocol: "recrest" }, makeCtx()),
      ).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Translucency (liquid-glass plugin)
  // -------------------------------------------------------------------------
  describe("supports_translucency", () => {
    it("returns a boolean", () => {
      // jsdom UA is Windows-like → returns false; actual value is platform-dependent
      const result = pluginStub("supports_translucency", {}, makeCtx());
      expect(result).toBeTypeOf("boolean");
    });

    it("returns false when not on macos (jsdom UA is windows)", () => {
      // jsdom's navigator.userAgent doesn't match /Mac|iPhone|iPad/, so detectPlatform → "windows"
      expect(pluginStub("supports_translucency", {}, makeCtx())).toBe(false);
    });
  });

  describe("set_translucency", () => {
    it("returns undefined", () => {
      expect(pluginStub("set_translucency", { enabled: true }, makeCtx())).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // Unknown command
  // -------------------------------------------------------------------------
  describe("unknown command", () => {
    it("returns UNHANDLED for an unrecognised plugin command", () => {
      expect(pluginStub("plugin:unknown|no_such_cmd", {}, makeCtx())).toBe(UNHANDLED);
    });

    it("returns UNHANDLED for a completely arbitrary string", () => {
      expect(pluginStub("xyzzy_not_a_real_command", {}, makeCtx())).toBe(UNHANDLED);
    });
  });
});

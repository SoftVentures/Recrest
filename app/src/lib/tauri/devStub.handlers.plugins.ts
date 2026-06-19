// Dev:web stub handlers for the `plugin:*` Tauri command namespaces — event,
// window, os, opener/shell, store, app, notification/dialog/autostart/process/
// updater/deep-link.
import { UNHANDLED } from "@/lib/tauri/devStub.providers";

type Args = Record<string, unknown>;

export interface PluginStubCtx {
  /** Allocate a new listener id and register the callback. */
  registerListener: (handler: (arg: unknown) => void) => number;
  /** Bind an already-registered callback id (minted by the Tauri API via
   *  `transformCallback`) to an event channel so `emit` can reach it. */
  bindEventListener: (event: string, handlerId: number) => void;
  /** Drop a previously registered listener. */
  unregisterListener: (id: number) => void;
}

/** Maps the browser UA to the literal value the Tauri backend would emit
 *  for `plugin:os|platform`. The return values are the on-wire IPC
 *  contract (Tauri's plugin-os returns these exact strings), so we don't
 *  funnel them through the `Platform` enum on the way out. */
function detectPlatform(): "macos" | "linux" | "windows" {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac|iPhone|iPad/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "linux";
  return "windows";
}

export function pluginStub(cmd: string, a: Args, ctx: PluginStubCtx): unknown | typeof UNHANDLED {
  switch (cmd) {
    case "plugin:event|listen": {
      // `@tauri-apps/api/event.listen` has already minted the callback via
      // `transformCallback` and passes its id as `handler`. Bind that id to
      // the channel so stub handlers can `emit` to it (e.g. the
      // `activity://commits-chunk` stream). Without the binding every event
      // subscription is a dead drop and dev:web pages waiting on events
      // render empty.
      const event = typeof a["event"] === "string" ? a["event"] : "";
      const handlerId = typeof a["handler"] === "number" ? a["handler"] : null;
      if (event && handlerId !== null) {
        ctx.bindEventListener(event, handlerId);
        return handlerId;
      }
      return ctx.registerListener(() => undefined);
    }
    case "plugin:event|unlisten": {
      const id = a["eventId"];
      if (typeof id === "number") ctx.unregisterListener(id);
      return undefined;
    }

    case "plugin:window|is_maximized":
    case "plugin:window|is_minimized":
    case "plugin:window|is_fullscreen":
    case "plugin:window|is_focused":
      return false;
    case "plugin:window|minimize":
    case "plugin:window|maximize":
    case "plugin:window|unmaximize":
    case "plugin:window|close":
    case "plugin:window|set_title":
    case "plugin:window|start_dragging":
    case "plugin:window|set_size":
    case "plugin:window|set_position":
    case "plugin:window|set_min_size":
    case "plugin:window|set_max_size":
    case "set_caption_button_bounds":
      return undefined;
    case "plugin:window|current_window":
    case "plugin:window|get_current":
      return { label: "main" };
    case "plugin:window|scale_factor":
      return 1;
    case "plugin:window|inner_size":
    case "plugin:window|outer_size":
      return { width: 1440, height: 900 };
    case "plugin:window|inner_position":
    case "plugin:window|outer_position":
      return { x: 0, y: 0 };

    case "plugin:os|platform":
      return detectPlatform();
    case "plugin:os|type": {
      const p = detectPlatform();
      return p === "macos" ? "Darwin" : p === "linux" ? "Linux" : "Windows_NT";
    }
    case "plugin:os|version":
      return "1.0.0";
    case "plugin:os|arch":
      return "x86_64";
    case "plugin:os|locale":
      return "en-US";

    case "plugin:opener|open_url":
    case "plugin:opener|open_path":
    case "plugin:shell|open":
      return undefined;

    case "plugin:store|load":
    case "plugin:store|get":
    case "plugin:store|set":
    case "plugin:store|save":
    case "plugin:store|delete":
    case "plugin:store|clear":
    case "plugin:store|length":
    case "plugin:store|entries":
    case "plugin:store|keys":
    case "plugin:store|values":
    case "plugin:store|has":
      return null;

    case "plugin:app|version":
      return typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
    case "plugin:app|name":
      return "Recrest";
    case "plugin:app|tauri_version":
      return "2.0.0";

    case "plugin:notification|is_permission_granted":
      return true;
    case "plugin:notification|request_permission":
      return "granted";
    case "plugin:notification|notify":
    case "plugin:dialog|open":
      return cmd === "plugin:dialog|open" ? null : undefined;
    case "plugin:autostart|is_enabled":
      return false;
    case "plugin:autostart|enable":
    case "plugin:autostart|disable":
      return undefined;
    case "plugin:process|relaunch":
    case "plugin:process|exit":
      return undefined;
    case "plugin:updater|check":
      return { available: false };
    case "plugin:deep-link|get_current":
      return null;
    case "plugin:deep-link|register":
    case "plugin:deep-link|unregister":
      return undefined;

    // Translucency (liquid-glass plugin) — macOS-only at runtime; we mirror
    // that capability here so `useTranslucencySupport` resolves identically
    // on macOS browsers and the Settings UI keeps surfacing the toggle. The
    // apply call is a no-op because there's no OS window to vibrancy.
    // Comparing against the wire-contract literal (`"macos"`, what Tauri's
    // plugin-os returns) rather than `Platform.MAC` (the renderer-side id
    // `"mac"`, which is a different domain).
    case "supports_translucency":
      return detectPlatform() === "macos";
    case "set_translucency":
      return undefined;

    default:
      return UNHANDLED;
  }
}

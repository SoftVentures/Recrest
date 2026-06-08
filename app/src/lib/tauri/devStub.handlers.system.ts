// Dev:web stub handlers for settings, OAuth, window state, platform info,
// notifications, updater hybrid + dev paths/build triple.
import { StorageKey } from "@/lib/constants/storage.constants";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import type { DevStubState } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

function detectPlatform(): "macos" | "linux" | "windows" {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac|iPhone|iPad/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "linux";
  return "windows";
}

export function systemStub(cmd: string, a: Args, state: DevStubState): unknown | typeof UNHANDLED {
  const seed = state.seed;

  switch (cmd) {
    case "notify":
      return undefined;

    case "begin_oauth":
      return { authorizationUrl: "about:blank", state: "stub" };

    case "complete_oauth":
      return undefined;

    case "get_settings": {
      // Mirror prod persistence: overlay localStorage on top of the seed so a
      // reload preserves theme/locale/accent etc. (the anti-flash inline
      // script in index.html relies on `recrest:theme`, which would otherwise
      // flash back to seed defaults every reload).
      try {
        const raw = window.localStorage.getItem(StorageKey.DEV_SETTINGS);
        if (raw) {
          const stored = JSON.parse(raw) as Record<string, unknown>;
          seed.settings = { ...(seed.settings as object), ...stored };
        }
      } catch {
        /* corrupt JSON or quota — fall back to seed */
      }
      return seed.settings;
    }

    case "update_settings": {
      // Real Tauri returns the patched AppSettings. The stub used to return
      // undefined which silently no-op'd settings-slice updates. Mirror prod:
      // apply the patch onto seed.settings and write through to localStorage.
      const patch = (a.patch ?? {}) as Record<string, unknown>;
      const current = (seed.settings ?? {}) as Record<string, unknown>;
      seed.settings = { ...current, ...patch };
      try {
        window.localStorage.setItem(StorageKey.DEV_SETTINGS, JSON.stringify(seed.settings));
      } catch {
        /* quota or blocked storage — non-fatal */
      }
      return seed.settings;
    }

    // Custom fonts are Tauri-only (filesystem-backed); the upload button is
    // disabled outside Tauri, so the list is always empty here.
    case "list_custom_fonts":
      return [];
    case "upload_font":
    case "delete_custom_font":
      return undefined;

    case "save_window_state":
      return undefined;
    case "load_window_state":
      return null;
    case "validate_window_position":
      return true;

    case "get_platform_info": {
      const os = detectPlatform();
      return {
        os,
        arch: "x86_64",
        version: os === "macos" ? "15.0" : os === "linux" ? "6.5" : "11",
        family: os === "windows" ? "windows" : "unix",
        debugAssertions: true,
      };
    }

    // OS probes degrade to the renderer's stub maps on an empty result, so
    // returning [] outside Tauri is the correct no-detection signal.
    case "detect_terminals":
    case "detect_shells":
      return [];

    case "check_git":
      return { installed: true, version: "2.44.0" };

    case "update_tray_badge":
      return undefined;

    case "check_for_update":
    case "install_update":
      return undefined;

    case "get_dev_paths":
      return {
        configDir: "~/Library/Application Support/Recrest (dev)",
        dataDir: "~/Library/Application Support/Recrest (dev)",
        cacheDir: "~/Library/Caches/Recrest (dev)",
        logDir: "~/Library/Logs/Recrest (dev)",
      };

    case "get_build_triple": {
      const os = detectPlatform() === "macos" ? "darwin" : detectPlatform();
      return `${os}-x86_64`;
    }

    case "dev_panic":
      return undefined;

    // The devLog forwarder (main.tsx, DEV builds) mirrors every console.*
    // call to `invoke("dev_log")`. Without an explicit branch this falls into
    // the default unhandled-command path, which calls console.warn — that
    // re-fires dev_log in a loop and pegs the main thread.
    case "dev_log":
      return undefined;

    default:
      return UNHANDLED;
  }
}

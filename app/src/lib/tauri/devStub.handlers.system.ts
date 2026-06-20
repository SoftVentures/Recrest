// Dev:web stub handlers for settings, OAuth, window state, platform info,
// notifications, updater hybrid + dev paths/build triple.
import { OAUTH_CALLBACK_EVENT } from "@/lib/constants/events.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import type { DevStubState } from "@/lib/tauri/devStub.state";

type Args = Record<string, unknown>;

interface SystemStubCtx {
  emit: (event: string, payload: unknown) => void;
}

function detectPlatform(): "macos" | "linux" | "windows" {
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  if (/Mac|iPhone|iPad/i.test(ua)) return "macos";
  if (/Linux|X11/i.test(ua) && !/Win/i.test(ua)) return "linux";
  return "windows";
}

export function systemStub(
  cmd: string,
  a: Args,
  state: DevStubState,
  ctx: SystemStubCtx,
): unknown | typeof UNHANDLED {
  const seed = state.seed;

  switch (cmd) {
    case "notify":
      return undefined;

    case "begin_oauth": {
      // Simulate the browser round-trip: a moment after we "open the browser",
      // the deep-link callback fires with an authorization code, exactly as the
      // real `recrest://oauth/callback` redirect would. Lets the live demo run
      // the full handshake without a real provider.
      const oauthState = "stub-state";
      setTimeout(() => {
        ctx.emit(OAUTH_CALLBACK_EVENT, {
          url: `recrest://oauth/callback?code=stub-code&state=${oauthState}`,
        });
      }, 400);
      return { state: oauthState, supportsOauth: true };
    }

    case "complete_oauth": {
      const providerId = String(a.providerId ?? "");
      const providers = seed.providers as Record<string, Record<string, unknown>>;
      const conn = providers[providerId];
      if (conn) {
        // Seed connection objects are frozen, so flip the pill by replacing the
        // whole map (top-level `seed.*` is writable, mirroring `update_settings`).
        seed.providers = {
          ...providers,
          [providerId]: { ...conn, connected: true, username: conn.username ?? "oauth-user" },
        };
      }
      return undefined;
    }

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

    case "get_system_facts": {
      // Dev:web has no host bridge, so don't fabricate OS/arch/git values —
      // the SystemInfoPanel renders its "—" fallback for missing fields.
      return {
        os: "web",
        arch: "browser",
        osVersion: undefined,
        gitVersion: undefined,
        appVersion: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0",
      };
    }

    case "get_data_sizes": {
      // Realistic-ish stub so the panel can render under dev:web / demo
      // builds. The real Tauri backend reads actual byte counts from the
      // app data dir.
      return {
        settingsBytes: 2_048,
        cacheBytes: 1_572_864,
        tokensBytes: 256,
      };
    }

    // OS probes degrade to the renderer's stub maps on an empty result, so
    // returning [] outside Tauri is the correct no-detection signal.
    case "detect_terminals":
    case "detect_shells":
      return [];

    // New bundle/registry-based discovery stubs (Phase 6). dev:web has no real
    // filesystem to scan, so we return a plausible per-platform set so the
    // picker renders realistically.
    case "list_terminals": {
      const p = detectPlatform();
      if (p === "macos") {
        return [
          {
            kind: "terminal",
            id: "apple-terminal",
            displayName: "Terminal",
            iconPath: null,
            launchCommand: {
              kind: "appBundle",
              bundlePath: "/System/Applications/Utilities/Terminal.app",
            },
          },
        ];
      }
      if (p === "windows") {
        return [
          {
            kind: "terminal",
            id: "windows-terminal",
            displayName: "Windows Terminal",
            iconPath: null,
            launchCommand: { kind: "executable", binary: "wt.exe", args: [] },
          },
        ];
      }
      return [];
    }

    case "list_ides": {
      const p = detectPlatform();
      if (p === "macos") {
        return [
          {
            kind: "ide",
            id: "vscode",
            displayName: "Visual Studio Code",
            iconPath: null,
            launchCommand: {
              kind: "appBundle",
              bundlePath: "/Applications/Visual Studio Code.app",
            },
          },
          {
            kind: "ide",
            id: "cursor",
            displayName: "Cursor",
            iconPath: null,
            launchCommand: { kind: "appBundle", bundlePath: "/Applications/Cursor.app" },
          },
        ];
      }
      if (p === "windows") {
        return [
          {
            kind: "ide",
            id: "vscode",
            displayName: "Visual Studio Code",
            iconPath: null,
            launchCommand: { kind: "executable", binary: "Code.exe", args: [] },
          },
        ];
      }
      return [];
    }

    // Pure happy-path: pretend the spawn worked. The real backend actually
    // forks a process; dev:web can't, so dropping the call is the closest
    // honest behavior.
    case "test_custom_terminal":
      return undefined;

    case "check_git":
      return { installed: true, version: "2.44.0" };

    // ThemeWrapper queries the OS truth on mount; null means "no override", so
    // the browser keeps trusting matchMedia (no real OS bridge under dev:web).
    case "get_system_dark_mode":
      return null;

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

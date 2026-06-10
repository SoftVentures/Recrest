/**
 * Dev-only stub for `yarn dev:web`.
 *
 * Installs a fake `window.__TAURI_INTERNALS__` so the React app can run
 * end-to-end in a plain browser without the Tauri runtime. Every IPC call
 * routed through `app/src/lib/tauri.ts::invoke` resolves against the seed
 * data declared in `./seed/`, which mirrors the Playwright fixture seed
 * (`tests/src/helpers/seed/`). The result is that the repo list, PR cards,
 * dashboard widgets and settings page all populate with realistic data
 * during browser-based smoke testing.
 *
 * Production safety:
 *  - The whole module is gated by `import.meta.env.DEV` at the call site
 *    (see `app/src/main.tsx`). Vite tree-shakes the import in production
 *    builds, so the seed data and stub plumbing never ship to users.
 *  - The call site also guards on `!('__TAURI_INTERNALS__' in window)` so
 *    Playwright tests (which install their own stub via `addInitScript`
 *    before the page loads) and the real Tauri shell are never overridden.
 *
 * Keep parity with the Playwright stub at `tests/src/helpers/tauri-stub.ts`.
 * When the backend grows a new command, add a branch to the matching
 * `devStub.handlers.<domain>.ts` module — otherwise `dev:web` silently
 * returns `null` and shows empty UI.
 */
import { type AppSeed, DEFAULT_SEED } from "@/lib/dev/seed";
import { gitStub } from "@/lib/tauri/devStub.handlers.git";
import { gitConfigStub } from "@/lib/tauri/devStub.handlers.gitConfig";
import { pluginStub } from "@/lib/tauri/devStub.handlers.plugins";
import { prDetailStub } from "@/lib/tauri/devStub.handlers.prDetail";
import { remoteStub } from "@/lib/tauri/devStub.handlers.remote";
import { reposStub } from "@/lib/tauri/devStub.handlers.repos";
import { systemStub } from "@/lib/tauri/devStub.handlers.system";
import { type DevSeedOverrides, applySeedOverrides } from "@/lib/tauri/devStub.overrides";
import { UNHANDLED } from "@/lib/tauri/devStub.providers";
import { type DevSeed, type DevStubState, createDevStubState } from "@/lib/tauri/devStub.state";

type Required_<T> = { [K in keyof T]-?: NonNullable<T[K]> };

function installStub(seed: Required_<AppSeed>): void {
  const state: DevStubState = createDevStubState(seed as unknown as DevSeed);

  const callbacks = new Map<number, (arg: unknown) => void>();
  // Maps an event channel name to the set of callback ids subscribed to it,
  // so `emit` can deliver only to that channel's listeners instead of
  // fanning every payload out to every subscription (which would feed a
  // `repo://status` listener a `commits-chunk` payload, and vice versa).
  const eventListeners = new Map<string, Set<number>>();
  let nextId = 1;

  function transformCallback(callback?: (arg: unknown) => void, once = false): number {
    const id = nextId++;
    callbacks.set(id, (arg) => {
      if (once) callbacks.delete(id);
      try {
        callback?.(arg);
      } catch (err) {
        console.warn("[dev-tauri-stub] callback err:", err);
      }
    });
    return id;
  }

  function registerEventListener(event: string, handler: (arg: unknown) => void): number {
    const id = transformCallback(handler);
    let set = eventListeners.get(event);
    if (!set) {
      set = new Set();
      eventListeners.set(event, set);
    }
    set.add(id);
    return id;
  }

  function removeListener(id: number): void {
    callbacks.delete(id);
    for (const set of eventListeners.values()) set.delete(id);
  }

  // Deliver an event to every listener subscribed to `event`, shaping the
  // argument like `@tauri-apps/api/event` does (`{ event, id, payload }`) so
  // handlers can read `e.payload` exactly as they do against the real runtime.
  function emit(event: string, payload: unknown): void {
    const set = eventListeners.get(event);
    if (!set) return;
    for (const id of set) {
      callbacks.get(id)?.({ event, id, payload });
    }
  }

  const pluginCtx = {
    registerListener: (handler: (arg: unknown) => void) => transformCallback(handler),
    // `plugin:event|listen` arrives with a callback id the Tauri API already
    // created via `transformCallback`; bind that existing id to the channel.
    bindEventListener: (event: string, handlerId: number) => {
      let set = eventListeners.get(event);
      if (!set) {
        set = new Set();
        eventListeners.set(event, set);
      }
      set.add(handlerId);
    },
    unregisterListener: (id: number) => {
      removeListener(id);
    },
  };

  const reposCtx = { emit };

  async function handleCommand(cmd: string, args: Record<string, unknown>): Promise<unknown> {
    // Dispatch through each domain handler in priority order. The first one
    // that doesn't return `UNHANDLED` wins. Order matters when a command
    // could plausibly belong to two domains (e.g. provider PR detail could
    // be `reposStub` or `prDetailStub`); the more specific module comes
    // first.
    const handlers: Array<(cmd: string, a: Record<string, unknown>) => unknown | typeof UNHANDLED> =
      [
        (c, a) => reposStub(c, a, state, reposCtx),
        (c, a) => gitStub(c, a, state),
        (c, a) => gitConfigStub(c, a, state),
        (c, a) => remoteStub(c, a, state),
        (c, a) => prDetailStub(c, a, state),
        (c, a) => systemStub(c, a, state),
        (c, a) => pluginStub(c, a, pluginCtx),
      ];
    for (const h of handlers) {
      const r = h(cmd, args);
      if (r !== UNHANDLED) return r;
    }
    console.warn("[dev-tauri-stub] unhandled command:", cmd, args);
    return null;
  }

  async function invoke(
    cmd: string,
    args?: Record<string, unknown>,
    _options?: unknown,
  ): Promise<unknown> {
    try {
      return await handleCommand(cmd, args || {});
    } catch (err) {
      console.error("[dev-tauri-stub] invoke crashed:", cmd, err);
      return null;
    }
  }

  // Marker so callers can distinguish "real Tauri runtime" from "browser
  // running with the dev stub installed". The titlebar dispatcher hides
  // the chrome when this is true — the browser already paints its own.
  Object.defineProperty(window, "__RECREST_DEV_STUB__", {
    configurable: true,
    writable: false,
    value: true,
  });

  Object.defineProperty(window, "__TAURI_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      invoke,
      transformCallback,
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { windowLabel: "main", label: "main" },
      },
      callbacks,
      convertFileSrc: (path: string) => path,
      // The real Tauri runtime exposes `unregisterListener` on the internals
      // object too; some `@tauri-apps/api/event` builds reach for it via
      // `__TAURI_INTERNALS__.unregisterListener` rather than the dedicated
      // `__TAURI_EVENT_PLUGIN_INTERNALS__` global below. Mirror it here so
      // both code paths resolve.
      unregisterListener: (_event: string, id: number) => {
        removeListener(id);
      },
      plugins: {
        event: {
          listen: (event: string, _target: unknown, handler: (arg: unknown) => void) =>
            registerEventListener(event, handler),
          unlisten: (_event: string, id: number) => {
            removeListener(id);
          },
          unregisterListener: (_event: string, id: number) => {
            removeListener(id);
          },
        },
      },
    },
  });

  // The real `@tauri-apps/api/event::_unlisten` calls
  // `window.__TAURI_EVENT_PLUGIN_INTERNALS__.unregisterListener(event, id)`
  // directly. Without this global the cleanup of every `listen()` subscription
  // throws `Cannot read properties of undefined (reading 'unregisterListener')`,
  // which fires on every component unmount that registered an event listener
  // (e.g. `useRepos`).
  Object.defineProperty(window, "__TAURI_EVENT_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      unregisterListener: (_event: string, id: number) => {
        removeListener(id);
      },
    },
  });

  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  const detectedPlatform = /Mac|iPhone|iPad/i.test(ua)
    ? "macos"
    : /Linux|X11/i.test(ua) && !/Win/i.test(ua)
      ? "linux"
      : "windows";
  Object.defineProperty(window, "__TAURI_OS_PLUGIN_INTERNALS__", {
    configurable: true,
    writable: false,
    value: {
      platform: detectedPlatform,
      version: "1.0.0",
      family:
        detectedPlatform === "windows" ? "windows" : detectedPlatform === "linux" ? "unix" : "unix",
      arch: "x86_64",
    },
  });
}

/**
 * Install the dev-only Tauri stub. Idempotent: calling twice is a no-op
 * because `__TAURI_INTERNALS__` is non-writable after the first install.
 */
export function installDevTauriStub(overrides?: DevSeedOverrides): void {
  const seed = applySeedOverrides(DEFAULT_SEED, overrides);
  installStub(seed as Required_<AppSeed>);
  const repoCount = seed.repos.length;
  const prCount = Object.values(seed.prs).reduce((sum, list) => sum + list.length, 0);
  console.info(
    `[dev] Tauri stub installed with seed (${repoCount} repos, ${prCount} pull requests)`,
  );
}

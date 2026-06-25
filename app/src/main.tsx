import React from "react";

import ReactDOM from "react-dom/client";

import { Provider as ReduxProvider } from "react-redux";

import { I18nextProvider } from "react-i18next";

import { StorageKey } from "@recrest/shared";

import App from "@/App";
import { isTauri } from "@/lib/tauri";
import i18n from "@/locales";
import { store } from "@/store";
import { setGroups } from "@/store/actions/repos.actions";
import "@/styles/globals.css";
import { ThemeWrapper } from "@/theme/ThemeWrapper";

import "@fontsource/fira-code/400.css";
import "@fontsource/fira-code/600.css";
import "@fontsource/geist-mono/400.css";
import "@fontsource/geist-mono/600.css";
import "@fontsource/geist/400.css";
import "@fontsource/geist/600.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/600.css";
// Webfonts — each face is needed both for in-app text (when the user picks it
// in Settings → Font) and for the live-preview in the font dropdown. Each
// MenuItem renders its label in its own font-family, so every option must
// have at least the 400+700 weights loaded or the row falls back to Inter.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/600.css";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/600.css";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";

/**
 * In `yarn dev:web` we install a stubbed `__TAURI_INTERNALS__` so the React
 * app can run end-to-end in a plain browser. The import is dynamic so Vite
 * tree-shakes the seed/stub plumbing out of production bundles.
 *
 * The public live demo (`vite build --mode demo`, embedded on the
 * landingpage) reuses exactly the same stub: `MODE === "demo"` is replaced
 * statically at build time, so regular production builds still drop all of
 * this, while the demo build keeps it and additionally syncs theme/locale
 * with the embedding landingpage via the demo bridge.
 *
 * **Must complete before render** — otherwise the first round of `useEffect`
 * thunks (`loadRepos`, `loadSettings`, …) fire while `__TAURI_INTERNALS__`
 * is still undefined and the app paints empty. The check on
 * `__TAURI_INTERNALS__` ensures the real Tauri shell + Playwright stubs
 * (installed via `addInitScript` before the page loads) are never overridden.
 */
async function bootstrap(): Promise<void> {
  const isDemoBuild = import.meta.env.MODE === "demo";
  if ((import.meta.env.DEV || isDemoBuild) && !("__TAURI_INTERNALS__" in window)) {
    const { installDevTauriStub } = await import("@/lib/tauri/devStub");
    if (isDemoBuild) {
      const { installDemoBridge, readDemoParams } = await import("@/lib/demo/demoBridge");
      const params = readDemoParams();
      installDevTauriStub(params.themeId ? { themeId: params.themeId } : undefined);
      if (params.locale) await i18n.changeLanguage(params.locale);
      installDemoBridge(store, (lng) => i18n.changeLanguage(lng));
      // Every landingpage visitor is a fresh origin profile, so without this
      // flag the first-run wizard would cover the seeded dashboard — the demo
      // should showcase the product, not the setup flow.
      localStorage.setItem(StorageKey.ONBOARDING_DISMISSED, "true");
    } else {
      installDevTauriStub();
    }
    // Seed the repos.groups slice — there is no IPC for listing groups, so
    // the stub owns this hand-off (mirrors src-old behaviour).
    const { DEFAULT_SEED } = await import("@/lib/dev/seed");
    store.dispatch(setGroups(DEFAULT_SEED.groups));
  }

  // Mirror console + window errors into `<repo_root>/.claude-dev.log`
  // via the Rust `dev_log` command so an external supervisor can read
  // what the WebView2 console saw without keeping DevTools open. Dev
  // builds only — Vite tree-shakes the dynamic import in production.
  if (import.meta.env.DEV) {
    const { installDevLogForwarder } = await import("@/lib/devLog");
    installDevLogForwarder();
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ReduxProvider store={store}>
        <I18nextProvider i18n={i18n}>
          <ThemeWrapper>
            <App />
          </ThemeWrapper>
        </I18nextProvider>
      </ReduxProvider>
    </React.StrictMode>,
  );

  // Reveal the main window AFTER the WebKit GPU compositor has actually
  // engaged the backdrop-filter layer. The window config has
  // `visible: false` to suppress macOS's cold-boot animation, but if we
  // call `show()` too eagerly the user still sees a 1-3 frame "boot
  // sequence" (transparent → window-chrome shadow → tint+blur snaps in)
  // because:
  //
  //   - React mounts and commits the DOM ✓
  //   - `::before` with `backdrop-filter` is in the layout tree ✓
  //   - WebKit has NOT yet allocated a backdrop-filter compositor layer
  //
  // The compositor lazy-initialises on the first frame that actually
  // needs a backdrop layer. To force it eagerly while the window is
  // still hidden, we drop an invisible probe div with its own
  // `backdrop-filter`, let WebKit composite a couple of frames, then
  // remove it. By the time `.show()` fires, the compositor is warm and
  // our real `::before` paints in frame 1.
  //
  // If anything in this chain fails, Rust spawns a 3-second safety-net
  // `window.show()` so the user never gets stuck on an invisible
  // window. See `app/src-tauri/src/lib.rs` (`spawn safety_handle ...`).
  if (isTauri()) {
    // Drop an invisible probe div with its own `backdrop-filter` so WebKit
    // is forced to allocate / re-engage the GPU compositor layer for
    // backdrop-filter. This is the workaround for two distinct symptoms:
    //
    //   1. Cold boot: window stays `visible: false` until the compositor
    //      is warm, so the user only sees the window AFTER the glass layer
    //      is ready (no transparent → shadow → blur sequence).
    //   2. Focus regain (Cmd-Tab, Stage Manager swap, Dock click): macOS
    //      captures the WebView's last paint when the window loses focus.
    //      WebKit drops the backdrop-filter layer on hidden windows; on
    //      focus regain it takes 1-3 frames to re-engage. During those
    //      frames the user sees the same boot-style sequence.
    //
    // The probe div is invisible (`opacity:0`) and pointer-events:none, so
    // it never affects the user. It exists for ~3 frames each invocation.
    let probing = false;
    const probeBackdropCompositor = async () => {
      if (probing) return;
      probing = true;
      const probe = document.createElement("div");
      probe.style.cssText =
        "position:fixed;inset:0;pointer-events:none;opacity:0;" +
        "background-color:rgba(0,0,0,0.001);" +
        "backdrop-filter:blur(1px);-webkit-backdrop-filter:blur(1px);";
      document.body.appendChild(probe);
      const raf = () => new Promise((r) => requestAnimationFrame(() => r(null)));
      await raf();
      await raf();
      await raf();
      probe.remove();
      probing = false;
    };

    // Cold-boot: warm compositor + show window when ready. Rust spawns a
    // 3 s safety-net `window.show()` so a JS error here can't strand the
    // user on an invisible window.
    const reveal = async () => {
      await probeBackdropCompositor();
      await new Promise((r) => setTimeout(r, 80));
      try {
        const mod = await import("@tauri-apps/api/webviewWindow");
        await mod.getCurrentWebviewWindow().show();
      } catch {
        /* non-fatal — Rust 3 s safety net catches this. */
      }
    };
    void reveal();

    // We deliberately do NOT re-run the probe on focus-regain. The desktop
    // blur is the OS `NSVisualEffectView` material (see `commands::theme`),
    // which macOS captures into the window snapshot it animates during Stage
    // Manager swap-in / Cmd-Tab / Dock click — so the snapshot already shows
    // the glass. Forcing a CSS backdrop-filter layer through the compositor on
    // focus events instead caused a visible "blue → black → blue" flicker as
    // the WKWebView's transient repaint exposed the layer mid-transition.
  }
}

void bootstrap();

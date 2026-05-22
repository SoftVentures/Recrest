import React from "react";

import ReactDOM from "react-dom/client";

import { Provider as ReduxProvider } from "react-redux";

import { I18nextProvider } from "react-i18next";

import App from "@/App";
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
 * **Must complete before render** — otherwise the first round of `useEffect`
 * thunks (`loadRepos`, `loadSettings`, …) fire while `__TAURI_INTERNALS__`
 * is still undefined and the app paints empty. The check on
 * `__TAURI_INTERNALS__` ensures the real Tauri shell + Playwright stubs
 * (installed via `addInitScript` before the page loads) are never overridden.
 */
async function bootstrap(): Promise<void> {
  if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
    const { installDevTauriStub } = await import("@/lib/tauri/devStub");
    installDevTauriStub();
    // Seed the repos.groups slice — there is no IPC for listing groups, so
    // the stub owns this hand-off (mirrors src-old behaviour).
    const { DEFAULT_SEED } = await import("@/lib/dev/seed");
    store.dispatch(setGroups(DEFAULT_SEED.groups));
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
}

void bootstrap();

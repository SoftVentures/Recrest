import React from "react";

import { BrowserRouter } from "react-router-dom";

import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/opendyslexic/400.css";
import "@fontsource/opendyslexic/700.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/700.css";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

import App from "@/App";
import { ConfirmProvider } from "@/components/atoms/ConfirmDialog";
import "@/i18n";
import { store } from "@/store";
import { setGroups } from "@/store/slices/reposSlice";
import "@/styles/globals.css";
import "@/styles/layout.scss";
import "@/styles/page-anim.scss";
// SCSS partials first — these declare the Recrest token layer that `globals.css`
// then aliases into Tailwind's `@theme`. `@tailwindcss/vite` bypasses Vite's CSS
// pipeline, so Sass files can't be `@import`ed from globals.css directly; we
// bring them in here where each import goes through Vite's own preprocessor.
import "@/styles/tokens.scss";
import "@/styles/views.scss";

// Opt into React Router v7 behaviour now so there's no surprise at upgrade
// time — silences the dev warnings these flags print otherwise.
const ROUTER_FUTURE = {
  v7_startTransition: true,
  v7_relativeSplatPath: true,
} as const;

async function bootstrap(): Promise<void> {
  // Dev-only: when running in pure-web mode (`yarn dev:web`) without the
  // Tauri runtime, install a fake `__TAURI_INTERNALS__` so every IPC call
  // resolves against seed data and the UI populates with realistic content.
  // - `import.meta.env.DEV` is replaced at build time, so the dynamic
  //   import is tree-shaken out of production bundles entirely.
  // - The `!('__TAURI_INTERNALS__' in window)` guard skips installation
  //   when Playwright (which sets up its own stub via `addInitScript`) or
  //   the real Tauri shell is already present.
  if (import.meta.env.DEV && !("__TAURI_INTERNALS__" in window)) {
    const { installDevTauriStub } = await import("@/lib/dev/tauriStub");
    installDevTauriStub();
    // Seed the repos.groups slice so the Repos page shows the human-readable
    // group names (`Open Source`, `Acme Labs`, …) instead of the slugged
    // group IDs. There is no IPC for listing groups today, so the stub
    // owns this hand-off.
    const { DEFAULT_SEED } = await import("@/lib/dev/seed");
    store.dispatch(setGroups(DEFAULT_SEED.groups));
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <Provider store={store}>
        <BrowserRouter future={ROUTER_FUTURE}>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </BrowserRouter>
      </Provider>
    </React.StrictMode>,
  );
}

void bootstrap();

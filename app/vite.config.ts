import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig, loadEnv } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

function gitShortSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "dev";
  }
}

const host = process.env.TAURI_DEV_HOST;
// Tauri sets TAURI_ENV_PLATFORM when it spawns the dev server as a child
// process. When it's missing we're in pure-web mode (`yarn dev:web`) — pick a
// different port so both can run side-by-side without a `strictPort` clash.
const isTauriDev = !!process.env.TAURI_ENV_PLATFORM;

// Ports are overridable from the repo-root `.env` (DEV_PORT_WEB /
// DEV_PORT_TAURI). The third arg of loadEnv is `""` so non-VITE_-prefixed
// keys are returned too; these never reach client code because they're only
// consumed here in the config layer.
const envMode = process.env.NODE_ENV || "development";
const rootEnv = loadEnv(envMode, repoRoot, "");
const webPort = Number(rootEnv.DEV_PORT_WEB || 3000);
const tauriPort = Number(rootEnv.DEV_PORT_TAURI || 1420);
const devPort = isTauriDev ? tauriPort : webPort;

// `tauri.conf.json::build.devUrl` is the URL the Tauri webview loads. If the
// user overrode DEV_PORT_TAURI but didn't sync that file, the window would
// boot blank with no error. Fail fast with a clear, actionable message.
if (isTauriDev) {
  const tauriConfPath = path.resolve(repoRoot, "app", "src-tauri", "tauri.conf.json");
  try {
    const conf = JSON.parse(readFileSync(tauriConfPath, "utf8")) as {
      build?: { devUrl?: string };
    };
    const devUrl = conf.build?.devUrl;
    const match = devUrl ? /:(\d+)(?:\/|$)/.exec(devUrl) : null;
    const confPort = match ? Number(match[1]) : NaN;
    if (Number.isFinite(confPort) && confPort !== tauriPort) {
      throw new Error(
        `[recrest] DEV_PORT_TAURI=${tauriPort} but tauri.conf.json::build.devUrl=${devUrl}. ` +
          "Update either .env or app/src-tauri/tauri.conf.json so both agree, otherwise the " +
          "Tauri window will load a port nothing is listening on.",
      );
    }
  } catch (err) {
    // Re-throw our own mismatch error; swallow JSON-parse / fs errors so a
    // missing or broken tauri.conf.json doesn't shadow the original failure
    // mode the dev would otherwise see from Tauri itself.
    if (err instanceof Error && err.message.startsWith("[recrest]")) throw err;
  }
}

export default defineConfig({
  envDir: repoRoot,
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    svgr({
      // Only transform imports that explicitly opt in with `?react`, so plain
      // `import url from './foo.svg'` still resolves to a URL string.
      include: "**/*.svg?react",
      svgrOptions: {
        exportType: "default",
        ref: true,
        svgo: false,
        dimensions: true,
      },
    }),
  ],
  clearScreen: false,
  resolve: {
    alias: {
      "@": srcDir,
    },
  },
  define: {
    // Some npm packages still reference Node's `global`; alias it to `globalThis`
    // so they work in the webview without shipping polyfills.
    global: "globalThis",
    __GIT_SHA__: JSON.stringify(gitShortSha()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  optimizeDeps: {
    // Pre-bundle frequently-imported deps so the dev server's first load
    // doesn't have to discover them lazily.
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "react-redux",
      "@reduxjs/toolkit",
      "react-i18next",
      "i18next",
      "lucide-react",
      "linguist-languages",
      "simple-icons",
    ],
    esbuildOptions: {
      // linguist-languages ships `export { default as 'Name With Space' }`
      // which needs ES2022 string-keyed exports.
      target: "es2022",
    },
  },
  esbuild: {
    target: "es2022",
  },
  server: {
    port: devPort,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: devPort + 1,
        }
      : undefined,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    // ES2022 is required for packages like linguist-languages that use
    // string-keyed export names (e.g. `export { default as 'Rocq Prover' }`).
    // Tauri's embedded webviews (WebView2, WKWebView, WebKitGTK) all support it.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome110" : "safari16",
    minify: !process.env.TAURI_ENV_DEBUG ? "esbuild" : false,
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router")
          ) {
            return "vendor-react";
          }
          if (id.includes("/@reduxjs/") || id.includes("/redux/") || id.includes("/react-redux/")) {
            return "vendor-redux";
          }
          if (id.includes("/i18next") || id.includes("/react-i18next/")) {
            return "vendor-i18n";
          }
          if (id.includes("/@tauri-apps/")) {
            return "vendor-tauri";
          }
          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }
        },
      },
    },
  },
});

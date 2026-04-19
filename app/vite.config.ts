import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vite";
import svgr from "vite-plugin-svgr";
import tsconfigPaths from "vite-tsconfig-paths";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));

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
const devPort = isTauriDev ? 1420 : 3000;

export default defineConfig({
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

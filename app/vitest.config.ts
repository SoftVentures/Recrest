import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import svgr from "vite-plugin-svgr";
import { defineConfig } from "vitest/config";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const sharedEntry = fileURLToPath(new URL("../shared/src/index.ts", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    svgr({
      include: "**/*.svg?react",
      svgrOptions: { exportType: "default", ref: true, svgo: false, dimensions: true },
    }),
  ],
  resolve: {
    alias: {
      "@": srcDir,
      "@recrest/shared": sharedEntry,
    },
  },
  // Mirror the build-time constants `vite.config.ts` defines. Without these,
  // any module that references `__GIT_SHA__` or `__BUILD_TIME__` crashes
  // under vitest with a `ReferenceError`.
  define: {
    __GIT_SHA__: JSON.stringify("test"),
    __BUILD_TIME__: JSON.stringify("1970-01-01T00:00:00.000Z"),
    __APP_VERSION__: JSON.stringify("0.0.0-test"),
  },
  test: {
    env: { TZ: "Europe/Berlin" },
    environment: "jsdom",
    globals: true,
    deps: {
      optimizer: {
        web: {
          // MUI 9.1 added internal/Transition.mjs which directory-imports
          // `react-transition-group/TransitionGroupContext`. Node's strict
          // ESM loader rejects directory imports; pre-bundle MUI through
          // esbuild so the directory path is resolved at build time.
          enabled: true,
          include: ["@mui/material", "@mui/icons-material", "react-transition-group"],
        },
      },
    },
    // V8 coverage instrumentation roughly doubles per-test wall time under
    // `test:coverage` (now the CI gate); a few heavier component specs brush
    // past the 5s default and flake. 15s absorbs the overhead without masking
    // a genuinely hung test.
    testTimeout: 15_000,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    exclude: ["src-old/**", "node_modules", "dist"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      // Keep the denominator honest: tests, stories, generated assets,
      // pure style/type modules and entrypoints have nothing to assert.
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.stories.{ts,tsx}",
        "src/**/*.styles.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/assets/**",
        "src/**/index.ts",
      ],
      // Plan 04/03 target — met: the settings tabs, ThemeWrapper, backendSync
      // and the activity/range layer are now covered, so lines clear 60% and
      // branches clear 50%. Keep ratcheting these up as coverage grows; never
      // lower them.
      thresholds: {
        lines: 60,
        branches: 50,
      },
    },
  },
});

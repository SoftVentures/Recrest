import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react-swc";
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
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

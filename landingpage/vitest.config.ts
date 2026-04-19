import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

import rootPkg from "../package.json";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
    __REPO_URL__: JSON.stringify("https://github.com/SoftVentures/Recrest"),
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
  },
});

import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

import rootPkg from "../package.json";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/Recrest/",
  envDir: path.resolve(__dirname, ".."),
  define: {
    __APP_VERSION__: JSON.stringify(rootPkg.version),
    __REPO_URL__: JSON.stringify("https://github.com/SoftVentures/Recrest"),
  },
  server: { port: 4321, strictPort: true },
  preview: { port: 4322, strictPort: true },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2022",
  },
  // Vite 8 uses Oxc instead of esbuild for transform.
  oxc: { target: "es2022" },
  optimizeDeps: {
    rolldownOptions: { transform: { target: "es2022" } },
  },
});

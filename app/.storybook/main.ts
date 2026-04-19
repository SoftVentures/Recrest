import path from "node:path";
import { fileURLToPath } from "node:url";

import type { StorybookConfig } from "@storybook/react-vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.@(ts|tsx|mdx)"],
  addons: ["@storybook/addon-docs"],
  framework: {
    name: "@storybook/react-vite",
    options: {},
  },
  typescript: {
    check: false,
    reactDocgen: "react-docgen-typescript",
  },
  viteFinal: async (cfg) => {
    // The app uses `@/*` → `src/*` paths via vite-tsconfig-paths in the
    // main Vite config. Storybook's Vite builder doesn't inherit that
    // plugin, so we replicate the mapping here (and only here — keep the
    // main config authoritative).
    cfg.resolve = cfg.resolve ?? {};
    cfg.resolve.alias = {
      ...(cfg.resolve.alias ?? {}),
      "@": path.resolve(__dirname, "../src"),
    };
    return cfg;
  },
};

export default config;

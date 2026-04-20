import type { Preview } from "@storybook/react-vite";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

import "@/i18n";
import "@/styles/globals.css";

const preview: Preview = {
  parameters: {
    controls: { expanded: true },
    layout: "centered",
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "var(--surface)" },
        { name: "dark", value: "#0f1115" },
        { name: "light", value: "#ffffff" },
      ],
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={250}>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default preview;

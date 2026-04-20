import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsSection } from "@/components/organisms/settings/SettingsSection";

const meta: Meta<typeof SettingsSection> = {
  title: "Organisms/Settings/SettingsSection",
  component: SettingsSection,
  parameters: { layout: "padded" },
};
export default meta;

export const Default: StoryObj<typeof SettingsSection> = {
  args: {
    title: "Appearance",
    description: "Theme, font, accent",
    children: <div style={{ padding: 12 }}>Content goes here.</div>,
  },
};

export const NoDescription: StoryObj<typeof SettingsSection> = {
  args: {
    title: "Diagnostics",
    children: <div style={{ padding: 12 }}>Compact body without description.</div>,
  },
};

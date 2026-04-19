import type { Meta, StoryObj } from "@storybook/react-vite";

import { SettingsSectionHeader } from "@/components/molecules/SettingsSectionHeader";

const meta: Meta<typeof SettingsSectionHeader> = {
  title: "Molecules/SettingsSectionHeader",
  component: SettingsSectionHeader,
};

export default meta;

export const Default: StoryObj<typeof SettingsSectionHeader> = {
  args: { title: "General", description: "Application behaviour, appearance, and notifications." },
};

export const TitleOnly: StoryObj<typeof SettingsSectionHeader> = {
  args: { title: "About" },
};

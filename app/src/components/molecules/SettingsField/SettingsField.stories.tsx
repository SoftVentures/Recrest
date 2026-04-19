import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "@/components/atoms/Switch";
import { SettingsField } from "@/components/molecules/SettingsField";

const meta: Meta<typeof SettingsField> = {
  title: "Molecules/SettingsField",
  component: SettingsField,
};

export default meta;

export const Default: StoryObj<typeof SettingsField> = {
  args: {
    label: "Start with system",
    description: "Launch Recrest when you log in.",
    children: <Switch />,
  },
};

export const WithHint: StoryObj<typeof SettingsField> = {
  args: {
    label: "Close to tray",
    description: "Keep Recrest running in the tray when you close the window.",
    hint: "The system tray is the small icon area next to your clock.",
    children: <Switch defaultChecked />,
  },
};

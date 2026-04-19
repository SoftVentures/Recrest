import type { Meta, StoryObj } from "@storybook/react-vite";

import { Switch } from "@/components/atoms/Switch";

const meta: Meta<typeof Switch> = {
  title: "Atoms/Switch",
  component: Switch,
};

export default meta;

export const Off: StoryObj<typeof Switch> = { args: { checked: false } };
export const On: StoryObj<typeof Switch> = { args: { checked: true } };
export const Disabled: StoryObj<typeof Switch> = { args: { disabled: true, checked: false } };
export const DisabledOn: StoryObj<typeof Switch> = { args: { disabled: true, checked: true } };

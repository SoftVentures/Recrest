import type { Meta, StoryObj } from "@storybook/react-vite";

import { Checkbox } from "@/components/atoms/Checkbox";

const meta: Meta<typeof Checkbox> = {
  title: "Atoms/Checkbox",
  component: Checkbox,
};

export default meta;

export const Unchecked: StoryObj<typeof Checkbox> = { args: { checked: false } };
export const Checked: StoryObj<typeof Checkbox> = { args: { checked: true } };
export const Disabled: StoryObj<typeof Checkbox> = { args: { disabled: true } };

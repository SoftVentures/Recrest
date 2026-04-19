import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "@/components/atoms/Input";

const meta: Meta<typeof Input> = {
  title: "Atoms/Input",
  component: Input,
};

export default meta;

export const Default: StoryObj<typeof Input> = {
  args: { placeholder: "Type something…" },
};
export const Password: StoryObj<typeof Input> = {
  args: { type: "password", placeholder: "Secret" },
};
export const Disabled: StoryObj<typeof Input> = {
  args: { disabled: true, value: "Disabled" },
};

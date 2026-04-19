import type { Meta, StoryObj } from "@storybook/react-vite";

import { Label } from "@/components/atoms/Label";

const meta: Meta<typeof Label> = {
  title: "Atoms/Label",
  component: Label,
};

export default meta;

export const Default: StoryObj<typeof Label> = { args: { children: "Field label" } };
export const WithHtmlFor: StoryObj<typeof Label> = {
  args: { children: "Personal access token", htmlFor: "pat-input" },
};
export const LongText: StoryObj<typeof Label> = {
  args: {
    children: "Automatically fetch pull requests every few minutes while the app is open",
  },
};

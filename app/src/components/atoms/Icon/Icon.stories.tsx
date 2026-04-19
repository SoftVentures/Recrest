import type { Meta, StoryObj } from "@storybook/react-vite";

import { Icon } from "@/components/atoms/Icon";

const meta: Meta<typeof Icon> = {
  title: "Atoms/Icon",
  component: Icon,
  args: { size: 24 },
};

export default meta;

export const Search: StoryObj<typeof Icon> = { args: { name: "search" } };
export const Branch: StoryObj<typeof Icon> = { args: { name: "branch" } };
export const Settings: StoryObj<typeof Icon> = { args: { name: "settings" } };
export const Scale: StoryObj<typeof Icon> = { args: { name: "scale" } };

import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthorAvatar } from "@/components/molecules/AuthorAvatar";

const meta: Meta<typeof AuthorAvatar> = {
  title: "Molecules/AuthorAvatar",
  component: AuthorAvatar,
};

export default meta;

export const Initials: StoryObj<typeof AuthorAvatar> = {
  args: { name: "Valentin Röhle" },
};

export const Single: StoryObj<typeof AuthorAvatar> = { args: { name: "octocat" } };

export const Large: StoryObj<typeof AuthorAvatar> = {
  args: { name: "Ada Lovelace", size: 48 },
};

export const Unknown: StoryObj<typeof AuthorAvatar> = { args: { name: null } };

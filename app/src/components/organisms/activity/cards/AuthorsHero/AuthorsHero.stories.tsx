import type { Meta, StoryObj } from "@storybook/react-vite";

import { AuthorsHero } from "@/components/organisms/activity/cards/AuthorsHero";

const meta: Meta<typeof AuthorsHero> = {
  title: "Organisms/Activity/AuthorsHero",
  component: AuthorsHero,
};
export default meta;

export const Default: StoryObj<typeof AuthorsHero> = {
  args: {
    authors: { current: 5, previous: 3, delta: 2 },
    topAuthors: [
      { name: "alice", email: "alice@example.com" },
      { name: "bob", email: "bob@example.com" },
      { name: "carol", email: null },
    ],
  },
};

export const Single: StoryObj<typeof AuthorsHero> = {
  args: {
    authors: { current: 1, previous: 1, delta: 0 },
    topAuthors: [{ name: "solo", email: null }],
  },
};

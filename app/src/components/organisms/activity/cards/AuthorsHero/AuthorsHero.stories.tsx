import type { Meta, StoryObj } from "@storybook/react-vite";

import AuthorsHero from "@/components/organisms/activity/cards/AuthorsHero";

const meta = {
  title: "Organisms/Activity/Cards/AuthorsHero",
  component: AuthorsHero,
  args: {
    authors: { current: 6, previous: 4, delta: 2 },
    topAuthors: [
      { name: "Valentin", email: "v@example.com" },
      { name: "Alice", email: "a@example.com" },
      { name: "Bob", email: null },
    ],
  },
} satisfies Meta<typeof AuthorsHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

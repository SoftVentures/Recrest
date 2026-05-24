import type { Meta, StoryObj } from "@storybook/react-vite";

import OpenPrsHero from "@/components/organisms/activity/cards/OpenPrsHero";

const meta = {
  title: "Organisms/Activity/Cards/OpenPrsHero",
  component: OpenPrsHero,
  args: { prsByRepo: {} },
} satisfies Meta<typeof OpenPrsHero>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

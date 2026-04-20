import type { Meta, StoryObj } from "@storybook/react-vite";

import { OpenPrsHero } from "@/components/organisms/activity/cards/OpenPrsHero";
import { fakePr } from "@/components/organisms/activity/cards/_fixtures";

const meta: Meta<typeof OpenPrsHero> = {
  title: "Organisms/Activity/OpenPrsHero",
  component: OpenPrsHero,
};
export default meta;

export const Default: StoryObj<typeof OpenPrsHero> = {
  args: {
    prsByRepo: {
      r1: [
        fakePr({ id: "1", number: 1 }),
        fakePr({ id: "2", number: 2, draft: true }),
        fakePr({ id: "3", number: 3 }),
      ],
    },
  },
};

export const Empty: StoryObj<typeof OpenPrsHero> = { args: { prsByRepo: {} } };

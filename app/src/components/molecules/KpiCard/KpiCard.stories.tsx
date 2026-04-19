import type { Meta, StoryObj } from "@storybook/react-vite";

import { KpiCard } from "@/components/molecules/KpiCard";

const meta: Meta<typeof KpiCard> = {
  title: "Molecules/KpiCard",
  component: KpiCard,
};

export default meta;

export const Default: StoryObj<typeof KpiCard> = {
  args: { label: "Open PRs", value: 4, hint: "2 ready to merge" },
};

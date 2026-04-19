import type { Meta, StoryObj } from "@storybook/react-vite";

import { KpiTile } from "@/components/molecules/KpiTile";

const meta: Meta<typeof KpiTile> = {
  title: "Molecules/KpiTile",
  component: KpiTile,
};

export default meta;

export const Default: StoryObj<typeof KpiTile> = {
  args: { label: "Open merge requests", value: 12, sub: "across 3 repos" },
};

export const Clickable: StoryObj<typeof KpiTile> = {
  args: {
    label: "Dirty repos",
    value: 5,
    sub: "Needs your attention",
    onClick: () => {},
  },
};

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";

const meta = {
  title: "Atoms/Sparklines/GeneralSparkline",
  component: GeneralSparkline,
  args: {
    data: [3, 5, 2, 0, 4, 6, 8, 5, 2, 1, 0, 3, 4, 6],
    width: 120,
    height: 24,
  },
} satisfies Meta<typeof GeneralSparkline>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const AllZeros: Story = { args: { data: [0, 0, 0, 0, 0, 0, 0] } };

import type { Meta, StoryObj } from "@storybook/react-vite";

import KpiCard from "@/components/molecules/cards/KpiCard";

const meta: Meta<typeof KpiCard> = {
  title: "Molecules/Cards/KpiCard",
  component: KpiCard,
  args: {
    label: "Open repos",
    value: 12,
    sub: "of 14 tracked",
    size: "lg",
  },
  argTypes: {
    size: { control: "inline-radio", options: ["md", "lg"] },
    accent: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof KpiCard>;

export const Large: Story = {};
export const LargeClickable: Story = {
  args: { onClick: () => {} },
};
export const LargeAccent: Story = { args: { accent: true } };
export const Medium: Story = { args: { size: "md" } };
export const MediumNoSub: Story = { args: { size: "md", sub: undefined } };

import { PrState } from "@recrest/shared";

import type { Meta, StoryObj } from "@storybook/react-vite";

import MrChip from "@/components/atoms/chips/MrChip";

const meta: Meta<typeof MrChip> = {
  title: "Atoms/Chips/MrChip",
  component: MrChip,
  args: {
    state: PrState.OPEN,
    draft: false,
    children: "open",
  },
  argTypes: {
    state: { control: "inline-radio", options: [PrState.OPEN, PrState.MERGED, PrState.CLOSED] },
    draft: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof MrChip>;

export const Open: Story = {};
export const Merged: Story = { args: { state: PrState.MERGED, children: "merged" } };
export const Closed: Story = { args: { state: PrState.CLOSED, children: "closed" } };
export const Draft: Story = { args: { draft: true, children: "draft" } };

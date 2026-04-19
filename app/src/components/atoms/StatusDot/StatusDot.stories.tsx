import type { Meta, StoryObj } from "@storybook/react-vite";

import { StatusDot } from "@/components/atoms/StatusDot";

const meta: Meta<typeof StatusDot> = {
  title: "Atoms/StatusDot",
  component: StatusDot,
};

export default meta;

export const Clean: StoryObj<typeof StatusDot> = { args: { kind: "clean" } };
export const Dirty: StoryObj<typeof StatusDot> = { args: { kind: "dirty" } };
export const Behind: StoryObj<typeof StatusDot> = { args: { kind: "behind" } };

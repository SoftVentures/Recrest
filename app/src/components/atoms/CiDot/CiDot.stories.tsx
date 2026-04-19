import type { Meta, StoryObj } from "@storybook/react-vite";

import { CiDot } from "@/components/atoms/CiDot";

const meta: Meta<typeof CiDot> = {
  title: "Atoms/CiDot",
  component: CiDot,
};

export default meta;

export const Passing: StoryObj<typeof CiDot> = { args: { state: "passing" } };
export const Failing: StoryObj<typeof CiDot> = { args: { state: "failing" } };
export const Running: StoryObj<typeof CiDot> = { args: { state: "running" } };
export const None: StoryObj<typeof CiDot> = { args: { state: null } };

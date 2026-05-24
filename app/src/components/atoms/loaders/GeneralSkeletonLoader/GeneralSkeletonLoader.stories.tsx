import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralSkeletonLoader, {
  SkeletonShape,
} from "@/components/atoms/loaders/GeneralSkeletonLoader";

const meta = {
  title: "Atoms/Loaders/GeneralSkeletonLoader",
  component: GeneralSkeletonLoader,
  args: { shape: SkeletonShape.LINE, width: 240 },
  argTypes: { shape: { control: "select", options: Object.values(SkeletonShape) } },
} satisfies Meta<typeof GeneralSkeletonLoader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Line: Story = {};
export const Block: Story = { args: { shape: SkeletonShape.BLOCK, width: 240, height: 80 } };
export const Circle: Story = { args: { shape: SkeletonShape.CIRCLE, width: 64, height: 64 } };

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";

const meta = {
  title: "Atoms/Loaders/GeneralCircularLoader",
  component: GeneralCircularLoader,
  args: { size: CircularLoaderSize.MD },
  argTypes: { size: { control: "select", options: Object.values(CircularLoaderSize) } },
} satisfies Meta<typeof GeneralCircularLoader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Indeterminate: Story = {};
export const Determinate: Story = { args: { value: 65 } };
export const Small: Story = { args: { size: CircularLoaderSize.SM } };
export const Large: Story = { args: { size: CircularLoaderSize.LG } };

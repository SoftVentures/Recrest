import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralLoader, { LoaderSize } from "@/components/atoms/loaders/GeneralLoader";

const meta = {
  title: "Atoms/Loaders/GeneralLoader",
  component: GeneralLoader,
  args: { size: LoaderSize.MD, label: "Loading" },
  argTypes: { size: { control: "select", options: Object.values(LoaderSize) } },
} satisfies Meta<typeof GeneralLoader>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Small: Story = { args: { size: LoaderSize.SM } };
export const Large: Story = { args: { size: LoaderSize.LG } };
export const NoLabel: Story = { args: { label: undefined } };

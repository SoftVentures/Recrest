import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";

const meta = {
  title: "Atoms/Buttons/GeneralButton",
  component: GeneralButton,
  args: { children: "Click me" },
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
    },
    size: { control: "select", options: ["default", "sm", "lg"] },
  },
} satisfies Meta<typeof GeneralButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Destructive: Story = { args: { variant: "destructive", children: "Delete" } };
export const Outline: Story = { args: { variant: "outline" } };
export const Secondary: Story = { args: { variant: "secondary" } };
export const Ghost: Story = { args: { variant: "ghost" } };
export const Link: Story = { args: { variant: "link" } };
export const Loading: Story = { args: { loading: true } };
export const Small: Story = { args: { size: "sm" } };
export const Large: Story = { args: { size: "lg" } };

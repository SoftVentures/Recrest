import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralCard from "@/components/atoms/cards/GeneralCard";

const Body = styled(Box)({ height: 120 });

const meta: Meta<typeof GeneralCard> = {
  title: "Atoms/Cards/GeneralCard",
  component: GeneralCard,
  args: {
    title: "Activity",
    sub: "Last 30 days",
    children: <Body>Card body</Body>,
  },
  argTypes: {
    skeleton: {
      control: "select",
      options: ["bars", "donut", "rows", "line", "heatmap", "radial"],
    },
  },
};

export default meta;

type Story = StoryObj<typeof GeneralCard>;

export const Default: Story = {};
export const LoadingRows: Story = { args: { loading: true, skeleton: "rows" } };
export const LoadingBars: Story = { args: { loading: true, skeleton: "bars" } };
export const LoadingDonut: Story = { args: { loading: true, skeleton: "donut" } };
export const LoadingHeatmap: Story = { args: { loading: true, skeleton: "heatmap" } };
export const NoHead: Story = { args: { title: undefined, sub: undefined } };

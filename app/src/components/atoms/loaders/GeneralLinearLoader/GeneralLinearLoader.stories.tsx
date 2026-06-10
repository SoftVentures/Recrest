import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralLinearLoader, {
  LinearLoaderThickness,
} from "@/components/atoms/loaders/GeneralLinearLoader";

const Stage = styled(Box)({ width: 320 });

const meta: Meta<typeof GeneralLinearLoader> = {
  title: "Atoms/Loaders/GeneralLinearLoader",
  component: GeneralLinearLoader,
  args: { thickness: LinearLoaderThickness.REGULAR },
  argTypes: {
    thickness: { control: "select", options: Object.values(LinearLoaderThickness) },
  },
  decorators: [
    (Story) => (
      <Stage>
        <Story />
      </Stage>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof GeneralLinearLoader>;

export const Indeterminate: Story = {};
export const Determinate: Story = { args: { value: 42 } };
export const Slim: Story = { args: { thickness: LinearLoaderThickness.SLIM } };
export const Thick: Story = { args: { thickness: LinearLoaderThickness.THICK } };

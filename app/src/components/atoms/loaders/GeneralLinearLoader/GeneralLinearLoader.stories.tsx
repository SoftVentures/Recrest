import { Box } from "@mui/material";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralLinearLoader, {
  LinearLoaderThickness,
} from "@/components/atoms/loaders/GeneralLinearLoader";

const meta: Meta<typeof GeneralLinearLoader> = {
  title: "Atoms/Loaders/GeneralLinearLoader",
  component: GeneralLinearLoader,
  args: { thickness: LinearLoaderThickness.REGULAR },
  argTypes: {
    thickness: { control: "select", options: Object.values(LinearLoaderThickness) },
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 320 }}>
        <Story />
      </Box>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof GeneralLinearLoader>;

export const Indeterminate: Story = {};
export const Determinate: Story = { args: { value: 42 } };
export const Slim: Story = { args: { thickness: LinearLoaderThickness.SLIM } };
export const Thick: Story = { args: { thickness: LinearLoaderThickness.THICK } };

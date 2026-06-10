import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";

function DefaultDemo() {
  const [value, setValue] = useState<string>("a");
  return (
    <GeneralButtonGroup
      value={value}
      exclusive
      onChange={(_, v: string | null) => v && setValue(v)}
    >
      <GeneralButtonGroupItem value="a">All</GeneralButtonGroupItem>
      <GeneralButtonGroupItem value="b">Active</GeneralButtonGroupItem>
      <GeneralButtonGroupItem value="c">Archived</GeneralButtonGroupItem>
    </GeneralButtonGroup>
  );
}

const meta: Meta<typeof GeneralButtonGroup> = {
  title: "Atoms/Buttons/GeneralButtonGroup",
  component: GeneralButtonGroup,
};

export default meta;

type Story = StoryObj<typeof GeneralButtonGroup>;

export const Default: Story = {
  render: () => <DefaultDemo />,
};

import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";

function DefaultDemo() {
  const [v, setV] = useState(false);
  return <GeneralSwitchInput checked={v} onCheckedChange={setV} />;
}

const meta: Meta<typeof GeneralSwitchInput> = {
  title: "Atoms/Inputs/GeneralSwitchInput",
  component: GeneralSwitchInput,
};

export default meta;

type Story = StoryObj<typeof GeneralSwitchInput>;

export const Default: Story = { render: () => <DefaultDemo /> };
export const On: Story = { render: () => <GeneralSwitchInput checked readOnly /> };
export const Disabled: Story = { render: () => <GeneralSwitchInput disabled /> };

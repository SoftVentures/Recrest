import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";

function DefaultDemo() {
  const [v, setV] = useState("");
  return (
    <GeneralSearchInput
      value={v}
      onChange={setV}
      placeholder="Search…"
      aria-label="Search"
      clearLabel="Clear search"
    />
  );
}

function WithValueDemo() {
  const [v, setV] = useState("recrest");
  return (
    <GeneralSearchInput
      value={v}
      onChange={setV}
      placeholder="Search…"
      aria-label="Search"
      clearLabel="Clear search"
    />
  );
}

const meta: Meta<typeof GeneralSearchInput> = {
  title: "Atoms/Inputs/GeneralSearchInput",
  component: GeneralSearchInput,
};

export default meta;

type Story = StoryObj<typeof GeneralSearchInput>;

export const Default: Story = { render: () => <DefaultDemo /> };
export const WithValue: Story = { render: () => <WithValueDemo /> };

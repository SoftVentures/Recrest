import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/Tabs";

const meta: Meta = {
  title: "Molecules/Compounds/Tabs",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>Tabs compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

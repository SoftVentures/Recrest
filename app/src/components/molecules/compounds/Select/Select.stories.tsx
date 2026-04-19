import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/Select";

const meta: Meta = {
  title: "Molecules/Compounds/Select",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>Select compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

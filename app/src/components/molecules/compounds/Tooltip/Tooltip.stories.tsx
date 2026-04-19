import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/Tooltip";

const meta: Meta = {
  title: "Molecules/Compounds/Tooltip",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>Tooltip compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/Dialog";

const meta: Meta = {
  title: "Molecules/Compounds/Dialog",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>Dialog compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/AlertDialog";

const meta: Meta = {
  title: "Molecules/Compounds/AlertDialog",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>AlertDialog compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

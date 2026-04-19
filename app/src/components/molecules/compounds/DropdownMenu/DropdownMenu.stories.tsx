import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/DropdownMenu";

const meta: Meta = {
  title: "Molecules/Compounds/DropdownMenu",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>DropdownMenu compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

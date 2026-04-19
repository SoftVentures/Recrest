import type { Meta, StoryObj } from "@storybook/react-vite";

import * as Compound from "@/components/molecules/compounds/ConfirmDialog";

const meta: Meta = {
  title: "Molecules/Compounds/ConfirmDialog",
};

export default meta;

export const Default: StoryObj = {
  render: () => <div>ConfirmDialog compound — see individual parts exposed from Compound.*</div>,
};

void Compound;

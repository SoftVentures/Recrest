import type { Meta, StoryObj } from "@storybook/react-vite";
import { X } from "lucide-react";

import GeneralIconButton, {
  IconButtonShape,
  IconButtonSize,
  IconButtonTone,
  IconButtonVariant,
} from "@/components/atoms/buttons/GeneralIconButton";

const meta = {
  title: "Atoms/Buttons/GeneralIconButton",
  component: GeneralIconButton,
  args: {
    icon: <X size={14} aria-hidden />,
    "aria-label": "Close",
  },
  argTypes: {
    size: { control: "select", options: Object.values(IconButtonSize) },
    variant: { control: "select", options: Object.values(IconButtonVariant) },
    shape: { control: "select", options: Object.values(IconButtonShape) },
    tone: { control: "select", options: Object.values(IconButtonTone) },
  },
} satisfies Meta<typeof GeneralIconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
export const Outline: Story = { args: { variant: IconButtonVariant.OUTLINE } };
export const Ghost: Story = { args: { variant: IconButtonVariant.GHOST } };
export const Circle: Story = { args: { shape: IconButtonShape.CIRCLE } };
export const Danger: Story = { args: { tone: IconButtonTone.DANGER } };
export const Large: Story = { args: { size: IconButtonSize.LG } };

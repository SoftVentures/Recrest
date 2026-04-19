import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "@/components/atoms/Button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/molecules/compounds/Tooltip";

const meta: Meta = {
  title: "Molecules/Compounds/Tooltip",
  decorators: [
    (Story) => (
      <TooltipProvider delayDuration={100}>
        <div className="flex justify-center p-16">
          <Story />
        </div>
      </TooltipProvider>
    ),
  ],
};

export default meta;

export const Default: StoryObj = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Hover me</Button>
      </TooltipTrigger>
      <TooltipContent>Refresh status for all repositories</TooltipContent>
    </Tooltip>
  ),
};

export const LongContent: StoryObj = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline">Long tooltip</Button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        Personal access tokens are only stored in the OS keychain. Recrest never writes them to disk
        in plaintext.
      </TooltipContent>
    </Tooltip>
  ),
};

export const Sides: StoryObj = {
  render: () => (
    <div className="grid grid-cols-2 gap-6">
      {(["top", "right", "bottom", "left"] as const).map((side) => (
        <Tooltip key={side}>
          <TooltipTrigger asChild>
            <Button variant="outline">{side}</Button>
          </TooltipTrigger>
          <TooltipContent side={side}>Opens on {side}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  ),
};

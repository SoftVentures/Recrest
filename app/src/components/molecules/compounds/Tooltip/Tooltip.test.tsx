import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/molecules/compounds/Tooltip";

describe("Tooltip", () => {
  it("rendert den Trigger", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Hover me</TooltipTrigger>
          <TooltipContent>Hilfe</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("Hover me")).toBeInTheDocument();
  });

  it("zeigt den Content-Text nach Fokus auf dem Trigger", async () => {
    const user = userEvent.setup();
    render(
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger>Trigger</TooltipTrigger>
          <TooltipContent>Tooltiptext</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );
    await user.tab();
    const matches = await screen.findAllByText("Tooltiptext");
    expect(matches.length).toBeGreaterThan(0);
  });
});

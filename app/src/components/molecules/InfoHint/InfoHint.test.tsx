import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoHint } from "@/components/molecules/InfoHint";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

describe("InfoHint", () => {
  it("rendert den Trigger mit Default-Label", () => {
    render(
      <TooltipProvider>
        <InfoHint>Mehr Infos</InfoHint>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "More info" })).toBeInTheDocument();
  });

  it("übernimmt ein eigenes Label", () => {
    render(
      <TooltipProvider>
        <InfoHint label="Hilfe">Text</InfoHint>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "Hilfe" })).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SettingsField } from "@/components/molecules/SettingsField";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";

describe("SettingsField", () => {
  it("rendert Label und Children", () => {
    render(
      <TooltipProvider>
        <SettingsField label="Theme">
          <input data-testid="ctrl" />
        </SettingsField>
      </TooltipProvider>,
    );
    expect(screen.getByText("Theme")).toBeInTheDocument();
    expect(screen.getByTestId("ctrl")).toBeInTheDocument();
  });

  it("zeigt die Description an", () => {
    render(
      <TooltipProvider>
        <SettingsField label="Locale" description="App-Sprache">
          <input />
        </SettingsField>
      </TooltipProvider>,
    );
    expect(screen.getByText("App-Sprache")).toBeInTheDocument();
  });

  it("rendert den Hint-Button, wenn ein hint gegeben ist", () => {
    render(
      <TooltipProvider>
        <SettingsField label="Polling" hint="Wie oft Repos geprüft werden">
          <input />
        </SettingsField>
      </TooltipProvider>,
    );
    expect(screen.getByRole("button", { name: "More info" })).toBeInTheDocument();
  });

  it("verknüpft das Label via htmlFor", () => {
    render(
      <TooltipProvider>
        <SettingsField label="Pfad" htmlFor="path-input">
          <input id="path-input" />
        </SettingsField>
      </TooltipProvider>,
    );
    expect(screen.getByText("Pfad").closest("label")).toHaveAttribute("for", "path-input");
  });
});

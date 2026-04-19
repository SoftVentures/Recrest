import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/molecules/compounds/Select";

describe("Select", () => {
  it("rendert den Trigger mit Placeholder", () => {
    render(
      <Select>
        <SelectTrigger>
          <SelectValue placeholder="Bitte wählen" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">A</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Bitte wählen")).toBeInTheDocument();
  });

  it("zeigt den ausgewählten Wert an, wenn ein Default gesetzt ist", () => {
    render(
      <Select defaultValue="b">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Apfel</SelectItem>
          <SelectItem value="b">Birne</SelectItem>
        </SelectContent>
      </Select>,
    );
    expect(screen.getByText("Birne")).toBeInTheDocument();
  });
});

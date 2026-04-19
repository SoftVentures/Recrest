import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { InfoCard } from "@/components/molecules/InfoCard";

describe("InfoCard", () => {
  it("rendert Children", () => {
    render(
      <InfoCard>
        <div>Body</div>
      </InfoCard>,
    );
    expect(screen.getByText("Body")).toBeInTheDocument();
  });

  it("rendert Titel und Action in der Kopfzeile", () => {
    render(
      <InfoCard title="Titel" action={<button type="button">Mehr</button>}>
        <div>B</div>
      </InfoCard>,
    );
    expect(screen.getByRole("heading", { name: "Titel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mehr" })).toBeInTheDocument();
  });
});

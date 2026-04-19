import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EmptyState } from "@/components/molecules/EmptyState";

describe("EmptyState", () => {
  it("rendert den Titel", () => {
    render(<EmptyState title="Keine Repos" />);
    expect(screen.getByRole("heading", { name: "Keine Repos" })).toBeInTheDocument();
  });

  it("zeigt Description und Action", () => {
    render(
      <EmptyState
        title="T"
        description="Noch nichts hier"
        action={<button type="button">Hinzufügen</button>}
      />,
    );
    expect(screen.getByText("Noch nichts hier")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hinzufügen" })).toBeInTheDocument();
  });

  it("rendert das optionale Icon", () => {
    function DummyIcon({ className }: { className?: string }) {
      return <svg className={className} data-testid="dummy" />;
    }
    render(<EmptyState title="x" icon={DummyIcon} />);
    expect(screen.getByTestId("dummy")).toBeInTheDocument();
  });
});

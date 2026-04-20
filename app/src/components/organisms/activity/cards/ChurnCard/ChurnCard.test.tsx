import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChurnCard } from "@/components/organisms/activity/cards/ChurnCard";
import "@/i18n";

describe("ChurnCard", () => {
  it("renders added/removed line counts", () => {
    render(
      <ChurnCard rows={[{ repoId: "r1", repoName: "app", added: 120, removed: 40, total: 160 }]} />,
    );
    expect(screen.getByText("app")).toBeInTheDocument();
    expect(screen.getByText("+120 −40")).toBeInTheDocument();
  });

  it("renders empty-state dash when rows are empty", () => {
    render(<ChurnCard rows={[]} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});

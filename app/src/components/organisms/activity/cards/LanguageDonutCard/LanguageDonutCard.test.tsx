import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LanguageDonutCard } from "@/components/organisms/activity/cards/LanguageDonutCard";
import "@/i18n";

describe("LanguageDonutCard", () => {
  it("renders a slice for each language entry", () => {
    const { container } = render(
      <LanguageDonutCard
        mix={[
          { language: "TypeScript", color: "#3178c6", share: 0.6, commits: 12 },
          { language: "Rust", color: "#dea584", share: 0.4, commits: 8 },
        ]}
      />,
    );
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
  });
});

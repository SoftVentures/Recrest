import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LeaderboardCard } from "@/components/organisms/activity/cards/LeaderboardCard";
import "@/i18n";

describe("LeaderboardCard", () => {
  it("renders an entry per bucket", () => {
    render(
      <LeaderboardCard
        buckets={[
          {
            author: "alice",
            email: null,
            count: 12,
            share: 0.6,
            sparkline: Array.from({ length: 14 }, () => 1),
          },
          {
            author: "bob",
            email: null,
            count: 8,
            share: 0.4,
            sparkline: Array.from({ length: 14 }, () => 0),
          },
        ]}
      />,
    );
    expect(screen.getByText("alice")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
  });

  it("renders the empty label when no buckets exist", () => {
    render(<LeaderboardCard buckets={[]} />);
    expect(screen.getByText(/No contributors/i)).toBeInTheDocument();
  });
});

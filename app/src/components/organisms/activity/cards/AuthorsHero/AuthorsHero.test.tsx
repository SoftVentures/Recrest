import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorsHero } from "@/components/organisms/activity/cards/AuthorsHero";
import "@/i18n";

describe("AuthorsHero", () => {
  it("renders author count and avatars", () => {
    render(
      <AuthorsHero
        authors={{ current: 5, previous: 3, delta: 2 }}
        topAuthors={[
          { name: "alice", email: null },
          { name: "bob", email: null },
          { name: "carol", email: null },
        ]}
      />,
    );
    expect(screen.getByText("5")).toBeInTheDocument();
  });
});

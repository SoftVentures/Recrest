import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AuthorClockCard } from "@/components/organisms/activity/cards/AuthorClockCard";
import "@/i18n";

describe("AuthorClockCard", () => {
  it("renders 24 hour wedges", () => {
    const hours = Array.from({ length: 24 }, (_, i) => (i >= 9 && i <= 17 ? 5 : 0));
    const { container } = render(<AuthorClockCard hours={hours} />);
    // 24 wedges + 1 base circle
    expect(container.querySelectorAll("path").length).toBeGreaterThanOrEqual(24);
  });
});

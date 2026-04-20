import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PrVelocityCard } from "@/components/organisms/activity/cards/PrVelocityCard";
import "@/i18n";

describe("PrVelocityCard", () => {
  it("renders two series paths", () => {
    const rows = Array.from({ length: 14 }, (_, day) => ({
      day,
      opened: day % 3,
      merged: day % 2,
    }));
    const { container } = render(<PrVelocityCard rows={rows} />);
    expect(container.querySelectorAll(".a-act-line-series")).toHaveLength(2);
  });
});

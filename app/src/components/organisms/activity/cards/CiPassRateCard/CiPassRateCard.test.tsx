import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CiPassRateCard } from "@/components/organisms/activity/cards/CiPassRateCard";
import "@/i18n";

describe("CiPassRateCard", () => {
  it("renders a line series and an area fill", () => {
    const rows = Array.from({ length: 14 }, (_, day) => ({
      day,
      passed: 9,
      total: 10,
      rate: 0.9,
    }));
    const { container } = render(<CiPassRateCard rows={rows} />);
    expect(container.querySelectorAll(".a-act-line-series")).toHaveLength(1);
    expect(container.querySelectorAll(".a-act-line-fill")).toHaveLength(1);
  });
});

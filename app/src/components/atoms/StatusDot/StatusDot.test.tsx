import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusDot } from "@/components/atoms/StatusDot";

describe("StatusDot", () => {
  it("rendert span mit status-dot und clean-Klasse", () => {
    const { container } = render(<StatusDot kind="clean" />);
    const el = container.firstElementChild;
    expect(el?.className).toBe("status-dot clean");
  });

  it("wendet dirty-Kind an", () => {
    const { container } = render(<StatusDot kind="dirty" />);
    expect(container.firstElementChild?.className).toBe("status-dot dirty");
  });

  it("wendet behind-Kind an", () => {
    const { container } = render(<StatusDot kind="behind" />);
    expect(container.firstElementChild?.className).toBe("status-dot behind");
  });
});

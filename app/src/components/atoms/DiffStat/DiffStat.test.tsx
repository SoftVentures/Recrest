import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DiffStat } from "@/components/atoms/DiffStat";

describe("DiffStat", () => {
  it("gibt null zurück ohne Änderungen", () => {
    const { container } = render(<DiffStat added={0} removed={0} />);
    expect(container.firstChild).toBeNull();
  });

  it("zeigt nur added wenn removed=0", () => {
    render(<DiffStat added={12} removed={0} />);
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.queryByText(/^−/)).toBeNull();
  });

  it("zeigt nur removed wenn added=0", () => {
    render(<DiffStat added={0} removed={5} />);
    expect(screen.getByText("−5")).toBeInTheDocument();
    expect(screen.queryByText(/^\+/)).toBeNull();
  });

  it("zeigt beides wenn added und removed > 0", () => {
    render(<DiffStat added={12} removed={53} />);
    expect(screen.getByText("+12")).toBeInTheDocument();
    expect(screen.getByText("−53")).toBeInTheDocument();
  });
});

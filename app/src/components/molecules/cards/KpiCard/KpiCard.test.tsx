import { Box } from "@mui/material";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import KpiCard from "@/components/molecules/cards/KpiCard";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("KpiCard", () => {
  it("renders label, value, sub", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.kpiCard.root}>
        <KpiCard label="Open repos" value={12} sub="of 14 tracked" />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.molecules.kpiCard.root);
    expect(wrap.textContent).toContain("Open repos");
    expect(wrap.textContent).toContain("12");
    expect(wrap.textContent).toContain("of 14 tracked");
  });

  it("disables click when onClick is omitted", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.kpiCard.root}>
        <KpiCard label="x" value={1} />
      </Box>,
    );
    const btn = getByTestId(COMPONENT_TEST_IDS.molecules.kpiCard.root).querySelector("button");
    expect(btn).not.toBeNull();
    expect(btn?.hasAttribute("disabled")).toBe(true);
  });

  it("fires onClick when supplied", () => {
    const spy = vi.fn();
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.molecules.kpiCard.root}>
        <KpiCard label="x" value={1} onClick={spy} />
      </Box>,
    );
    const btn = getByTestId(COMPONENT_TEST_IDS.molecules.kpiCard.root).querySelector("button");
    fireEvent.click(btn!);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

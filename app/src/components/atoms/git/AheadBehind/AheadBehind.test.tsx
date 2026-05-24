import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import AheadBehind from "@/components/atoms/git/AheadBehind";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("AheadBehind", () => {
  it("renders both glyphs in compact variant", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.aheadBehind.root}>
        <AheadBehind ahead={5} behind={3} />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.atoms.aheadBehind.root);
    expect(wrap.textContent).toContain("↑5");
    expect(wrap.textContent).toContain("↓3");
  });

  it("hides zero halves in compact variant by default", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.aheadBehind.root}>
        <AheadBehind ahead={5} behind={0} />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.atoms.aheadBehind.root);
    expect(wrap.textContent).toContain("↑5");
    expect(wrap.textContent).not.toContain("↓");
  });

  it("renders nothing when both sides are zero and hideZero defaults apply", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.aheadBehind.root}>
        <AheadBehind ahead={0} behind={0} />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.atoms.aheadBehind.root);
    expect(wrap.children.length).toBe(0);
  });

  it("renders separated variant with a slash separator", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.aheadBehind.root}>
        <AheadBehind ahead={5} behind={3} variant="separated" />
      </Box>,
    );
    const wrap = getByTestId(COMPONENT_TEST_IDS.atoms.aheadBehind.root);
    expect(wrap.textContent).toContain("/");
    expect(wrap.textContent).toContain("↑");
    expect(wrap.textContent).toContain("↓");
  });
});

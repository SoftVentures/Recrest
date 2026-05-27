import { Box } from "@mui/material";

import { PrState } from "@recrest/shared";

import { describe, expect, it } from "vitest";

import MrChip from "@/components/atoms/chips/MrChip";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

const ROOT = COMPONENT_TEST_IDS.atoms.mrChip.root;

describe("MrChip", () => {
  it("renders the provided label", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={ROOT}>
        <MrChip state={PrState.OPEN}>open</MrChip>
      </Box>,
    );
    expect(getByTestId(ROOT).textContent).toBe("open");
  });

  it("uses the draft tone regardless of state when draft is set", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={ROOT}>
        <MrChip state={PrState.OPEN} draft>
          draft
        </MrChip>
      </Box>,
    );
    expect(getByTestId(ROOT).textContent).toBe("draft");
  });

  it("renders merged and closed labels", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={ROOT}>
        <MrChip state={PrState.MERGED}>merged</MrChip>
        <MrChip state={PrState.CLOSED}>closed</MrChip>
      </Box>,
    );
    expect(getByTestId(ROOT).textContent).toBe("mergedclosed");
  });
});

import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import BranchFilterChip from "@/components/atoms/chips/BranchFilterChip";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

const ROOT = COMPONENT_TEST_IDS.atoms.branchFilterChip.root;

describe("BranchFilterChip", () => {
  it("renders the provided label", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={ROOT}>
        <BranchFilterChip tone="current">current</BranchFilterChip>
      </Box>,
    );
    expect(getByTestId(ROOT).textContent).toBe("current");
  });

  it("renders each tone variant", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={ROOT}>
        <BranchFilterChip tone="dirty">dirty</BranchFilterChip>
        <BranchFilterChip tone="clean">clean</BranchFilterChip>
        <BranchFilterChip tone="remote">remote</BranchFilterChip>
      </Box>,
    );
    expect(getByTestId(ROOT).textContent).toBe("dirtycleanremote");
  });
});

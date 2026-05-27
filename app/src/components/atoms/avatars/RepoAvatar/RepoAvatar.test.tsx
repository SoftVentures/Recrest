import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("RepoAvatar", () => {
  it("renders an avatar tile", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.repoAvatar.wrap}>
        <RepoAvatar repo={{ id: "r1", name: "_dotfiles" }} />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.repoAvatar.wrap).children.length).toBe(1);
  });
});

import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import AuthorAvatar from "@/components/atoms/avatars/AuthorAvatar";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("AuthorAvatar", () => {
  it("renders an avatar tile", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.authorAvatar.wrap}>
        <AuthorAvatar name="alice" email="alice@example.com" />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.authorAvatar.wrap).children.length).toBe(1);
  });

  it("renders even when name is empty", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.authorAvatar.wrap}>
        <AuthorAvatar name="" />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.authorAvatar.wrap).children.length).toBe(1);
  });
});

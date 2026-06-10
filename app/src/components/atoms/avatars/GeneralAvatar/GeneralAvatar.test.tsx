import { Box } from "@mui/material";

import { describe, expect, it } from "vitest";

import GeneralAvatar from "@/components/atoms/avatars/GeneralAvatar";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralAvatar", () => {
  it("mounts inside its wrapper", () => {
    const { getByTestId } = renderWithTheme(
      <Box data-testid={COMPONENT_TEST_IDS.atoms.avatar.wrap}>
        <GeneralAvatar
          size={32}
          radius={8}
          gradient="linear-gradient(135deg,#000,#fff)"
          letter="A"
          label="Alice"
        />
      </Box>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.avatar.wrap).children.length).toBe(1);
  });
});

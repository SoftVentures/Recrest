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

  it("renders the provider-supplied avatar URL as the tile image", () => {
    const { container } = renderWithTheme(
      <AuthorAvatar name="Ada Lovelace" avatarUrl="https://example.test/ada.png" />,
    );
    const img = container.querySelector("img");
    expect(img).not.toBeNull();
    expect(img?.getAttribute("src")).toBe("https://example.test/ada.png");
  });

  it("renders a bot glyph for `[bot]` authors without attempting Gravatar", () => {
    const { container } = renderWithTheme(
      <AuthorAvatar
        name="dependabot[bot]"
        email="49699333+dependabot[bot]@users.noreply.github.com"
      />,
    );
    // No image — bots never get an image fallback even when an email is set.
    expect(container.querySelector("img")).toBeNull();
    // The lucide `Bot` icon renders an inline svg inside the tile.
    expect(container.querySelector("svg")).not.toBeNull();
  });
});

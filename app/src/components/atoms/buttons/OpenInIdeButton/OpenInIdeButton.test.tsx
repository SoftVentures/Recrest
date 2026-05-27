import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import OpenInIdeButton, { OpenInIdeVariant } from "@/components/atoms/buttons/OpenInIdeButton";
import { renderWithTheme } from "@/test/utils";

describe("OpenInIdeButton", () => {
  it("renders an icon-only trigger by default", () => {
    renderWithTheme(<OpenInIdeButton repoId="r1" />);
    expect(screen.getByRole("button")).toBeInTheDocument();
  });

  it("renders a labelled button in BUTTON variant", () => {
    renderWithTheme(
      <OpenInIdeButton repoId="r1" variant={OpenInIdeVariant.BUTTON} label="Open in IDE" />,
    );
    expect(screen.getByRole("button", { name: /open in ide/i })).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import GeneralLinearLoader from "@/components/atoms/loaders/GeneralLinearLoader";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralLinearLoader", () => {
  it("renders the bar root", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralLinearLoader data-testid={COMPONENT_TEST_IDS.atoms.linearLoader.root} />,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.linearLoader.root)).toBeInTheDocument();
  });
});

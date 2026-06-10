import { describe, expect, it } from "vitest";

import GeneralCircularLoader from "@/components/atoms/loaders/GeneralCircularLoader";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralCircularLoader", () => {
  it("renders the spinner root", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralCircularLoader data-testid={COMPONENT_TEST_IDS.atoms.circularLoader.root} />,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.circularLoader.root)).toBeInTheDocument();
  });
});

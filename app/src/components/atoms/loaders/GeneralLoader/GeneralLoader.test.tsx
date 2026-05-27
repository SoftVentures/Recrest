import { describe, expect, it } from "vitest";

import GeneralLoader from "@/components/atoms/loaders/GeneralLoader";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralLoader", () => {
  it("renders the loader root", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralLoader data-testid={COMPONENT_TEST_IDS.atoms.loader.root} label="x" />,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.loader.root)).toBeInTheDocument();
  });
});

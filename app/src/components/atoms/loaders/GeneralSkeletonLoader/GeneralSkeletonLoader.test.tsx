import { describe, expect, it } from "vitest";

import GeneralSkeletonLoader from "@/components/atoms/loaders/GeneralSkeletonLoader";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralSkeletonLoader", () => {
  it("renders the skeleton root", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralSkeletonLoader data-testid={COMPONENT_TEST_IDS.atoms.skeletonLoader.root} />,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.skeletonLoader.root)).toBeInTheDocument();
  });
});

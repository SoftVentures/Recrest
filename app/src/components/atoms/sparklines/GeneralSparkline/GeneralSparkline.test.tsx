import { describe, expect, it } from "vitest";

import GeneralSparkline from "@/components/atoms/sparklines/GeneralSparkline";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralSparkline", () => {
  it("renders one bar per data point", () => {
    const data = [1, 2, 3, 4, 5];
    const { getByTestId } = renderWithTheme(
      <GeneralSparkline data={data} testId={COMPONENT_TEST_IDS.atoms.sparkline.root} />,
    );
    const root = getByTestId(COMPONENT_TEST_IDS.atoms.sparkline.root);
    expect(root.children.length).toBe(data.length);
  });
});

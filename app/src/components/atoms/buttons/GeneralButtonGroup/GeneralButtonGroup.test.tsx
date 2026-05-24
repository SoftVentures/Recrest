import { describe, expect, it } from "vitest";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralButtonGroup", () => {
  it("renders all segment items", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralButtonGroup
        data-testid={COMPONENT_TEST_IDS.atoms.buttonGroup.root}
        value="a"
        exclusive
        onChange={() => {}}
      >
        <GeneralButtonGroupItem value="a" data-testid={COMPONENT_TEST_IDS.atoms.buttonGroup.segA}>
          All
        </GeneralButtonGroupItem>
        <GeneralButtonGroupItem value="b" data-testid={COMPONENT_TEST_IDS.atoms.buttonGroup.segB}>
          Active
        </GeneralButtonGroupItem>
      </GeneralButtonGroup>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.buttonGroup.root)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.buttonGroup.segA)).toBeInTheDocument();
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.buttonGroup.segB)).toBeInTheDocument();
  });
});

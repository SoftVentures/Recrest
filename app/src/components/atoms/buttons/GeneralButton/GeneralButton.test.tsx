import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralButton", () => {
  it("fires onClick", () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(
      <GeneralButton data-testid={COMPONENT_TEST_IDS.atoms.button.root} onClick={onClick}>
        Save
      </GeneralButton>,
    );
    fireEvent.click(getByTestId(COMPONENT_TEST_IDS.atoms.button.root));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is disabled while loading", () => {
    const { getByTestId } = renderWithTheme(
      <GeneralButton data-testid={COMPONENT_TEST_IDS.atoms.button.root} loading>
        Save
      </GeneralButton>,
    );
    expect(getByTestId(COMPONENT_TEST_IDS.atoms.button.root)).toBeDisabled();
  });
});

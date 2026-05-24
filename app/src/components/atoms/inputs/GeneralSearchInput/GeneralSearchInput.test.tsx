import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import GeneralSearchInput from "@/components/atoms/inputs/GeneralSearchInput";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralSearchInput", () => {
  it("fires onChange with the new value", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithTheme(
      <GeneralSearchInput
        value=""
        onChange={onChange}
        aria-label="Search"
        clearLabel="Clear"
        data-testid={COMPONENT_TEST_IDS.atoms.searchInput.root}
      />,
    );
    fireEvent.change(getByTestId(COMPONENT_TEST_IDS.atoms.searchInput.root), {
      target: { value: "hello" },
    });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("renders the clear button when value is non-empty and clears on click", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithTheme(
      <GeneralSearchInput
        value="hello"
        onChange={onChange}
        aria-label="Search"
        clearLabel="Clear"
        data-testid={COMPONENT_TEST_IDS.atoms.searchInput.root}
        clearTestId={COMPONENT_TEST_IDS.atoms.searchInput.clear}
      />,
    );
    fireEvent.click(getByTestId(COMPONENT_TEST_IDS.atoms.searchInput.clear));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

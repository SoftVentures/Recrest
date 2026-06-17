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

  describe("feedbackState", () => {
    it("stays clickable in idle", () => {
      const { getByTestId } = renderWithTheme(
        <GeneralButton data-testid={COMPONENT_TEST_IDS.atoms.button.root} feedbackState="idle">
          Save
        </GeneralButton>,
      );
      expect(getByTestId(COMPONENT_TEST_IDS.atoms.button.root)).not.toBeDisabled();
    });

    it("disables and shows a spinner while loading", () => {
      const { getByTestId, container } = renderWithTheme(
        <GeneralButton data-testid={COMPONENT_TEST_IDS.atoms.button.root} feedbackState="loading">
          Save
        </GeneralButton>,
      );
      expect(getByTestId(COMPONENT_TEST_IDS.atoms.button.root)).toBeDisabled();
      // MUI CircularProgress renders an element with role=progressbar.
      expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it("stays clickable on success and shows the check glyph", () => {
      const onClick = vi.fn();
      const { getByTestId } = renderWithTheme(
        <GeneralButton
          data-testid={COMPONENT_TEST_IDS.atoms.button.root}
          feedbackState="success"
          onClick={onClick}
        >
          Save
        </GeneralButton>,
      );
      const btn = getByTestId(COMPONENT_TEST_IDS.atoms.button.root);
      expect(btn).not.toBeDisabled();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("stays clickable on error", () => {
      const onClick = vi.fn();
      const { getByTestId } = renderWithTheme(
        <GeneralButton
          data-testid={COMPONENT_TEST_IDS.atoms.button.root}
          feedbackState="error"
          onClick={onClick}
        >
          Save
        </GeneralButton>,
      );
      const btn = getByTestId(COMPONENT_TEST_IDS.atoms.button.root);
      expect(btn).not.toBeDisabled();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

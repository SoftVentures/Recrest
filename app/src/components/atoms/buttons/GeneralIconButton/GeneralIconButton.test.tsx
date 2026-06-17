import { fireEvent } from "@testing-library/react";
import { X } from "lucide-react";
import { describe, expect, it, vi } from "vitest";

import GeneralIconButton from "@/components/atoms/buttons/GeneralIconButton";
import { COMPONENT_TEST_IDS } from "@/lib/constants/componentTests.constants";
import { renderWithTheme } from "@/test/utils";

describe("GeneralIconButton", () => {
  it("fires onClick", () => {
    const onClick = vi.fn();
    const { getByTestId } = renderWithTheme(
      <GeneralIconButton
        data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
        aria-label="Close"
        onClick={onClick}
        icon={<X size={14} />}
      />,
    );
    fireEvent.click(getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  describe("feedbackState", () => {
    it("stays clickable in idle", () => {
      const { getByTestId } = renderWithTheme(
        <GeneralIconButton
          data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
          aria-label="Refresh"
          feedbackState="idle"
          icon={<X size={14} />}
        />,
      );
      expect(getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root)).not.toBeDisabled();
    });

    it("disables and shows a spinner while loading", () => {
      const { getByTestId, container } = renderWithTheme(
        <GeneralIconButton
          data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
          aria-label="Refresh"
          feedbackState="loading"
          icon={<X size={14} />}
        />,
      );
      expect(getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root)).toBeDisabled();
      expect(container.querySelector('[role="progressbar"]')).not.toBeNull();
    });

    it("stays clickable on success and fires onClick", () => {
      const onClick = vi.fn();
      const { getByTestId } = renderWithTheme(
        <GeneralIconButton
          data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
          aria-label="Refresh"
          feedbackState="success"
          icon={<X size={14} />}
          onClick={onClick}
        />,
      );
      const btn = getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root);
      expect(btn).not.toBeDisabled();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    it("stays clickable on error and fires onClick", () => {
      const onClick = vi.fn();
      const { getByTestId } = renderWithTheme(
        <GeneralIconButton
          data-testid={COMPONENT_TEST_IDS.atoms.iconButton.root}
          aria-label="Refresh"
          feedbackState="error"
          icon={<X size={14} />}
          onClick={onClick}
        />,
      );
      const btn = getByTestId(COMPONENT_TEST_IDS.atoms.iconButton.root);
      expect(btn).not.toBeDisabled();
      fireEvent.click(btn);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});

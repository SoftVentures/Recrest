import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ConfirmationModal", () => {
  it("fires onConfirm and onCancel when the action buttons are clicked", () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    const { getByTestId } = renderWithProviders(
      <ConfirmationModal open title="Are you sure?" onCancel={onCancel} onConfirm={onConfirm} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.confirmDialog.cancel));
    expect(onCancel).toHaveBeenCalledTimes(1);
    fireEvent.click(getByTestId(TEST_IDS.confirmDialog.confirm));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

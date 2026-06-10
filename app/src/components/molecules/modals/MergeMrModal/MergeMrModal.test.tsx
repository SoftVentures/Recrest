import { MergeStrategy } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import MergeMrModal from "@/components/molecules/modals/MergeMrModal";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const baseProps = {
  open: true,
  prTitle: "Fix flaky test",
  prNumber: 7,
  prBody: "body",
  sourceBranch: "feature-x",
  targetBranch: "main",
  onCancel: vi.fn(),
};

describe("MergeMrModal", () => {
  it("disables the Rebase strategy when providerId is bitbucket", () => {
    const onConfirm = vi.fn();
    const { getByTestId } = renderWithProviders(
      <MergeMrModal {...baseProps} providerId="bitbucket" onConfirm={onConfirm} />,
    );
    const rebaseRadio = getByTestId(TEST_IDS.mr.mergeModal.strategy(MergeStrategy.REBASE));
    expect((rebaseRadio as HTMLInputElement).disabled).toBe(true);
    const mergeRadio = getByTestId(TEST_IDS.mr.mergeModal.strategy(MergeStrategy.MERGE));
    expect((mergeRadio as HTMLInputElement).disabled).toBe(false);
  });

  it("submits the selected strategy via onConfirm", () => {
    const onConfirm = vi.fn();
    const { getByTestId } = renderWithProviders(
      <MergeMrModal {...baseProps} providerId="github" onConfirm={onConfirm} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.mr.mergeModal.strategy(MergeStrategy.SQUASH)));
    fireEvent.click(getByTestId(TEST_IDS.mr.mergeModal.confirm));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm.mock.calls[0]?.[0]).toMatchObject({
      strategy: MergeStrategy.SQUASH,
      deleteSourceBranch: false,
    });
  });
});

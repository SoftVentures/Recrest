import { describe, expect, it } from "vitest";

import CreateBranchDialog from "@/components/organisms/repos/CreateBranchDialog";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("CreateBranchDialog", () => {
  it("renders root, input, switch, and submit when open", () => {
    const { getByTestId } = renderWithProviders(
      <CreateBranchDialog open repoId={null} onClose={() => {}} />,
    );
    expect(getByTestId(TEST_IDS.createBranchDialog.root)).toBeTruthy();
    expect(getByTestId(TEST_IDS.createBranchDialog.name)).toBeTruthy();
    expect(getByTestId(TEST_IDS.createBranchDialog.checkout)).toBeTruthy();
    expect(getByTestId(TEST_IDS.createBranchDialog.submit)).toBeTruthy();
    expect(getByTestId(TEST_IDS.createBranchDialog.cancel)).toBeTruthy();
  });

  it("submit is disabled when name is empty", () => {
    const { getByTestId } = renderWithProviders(
      <CreateBranchDialog open repoId={null} onClose={() => {}} />,
    );
    const submit = getByTestId(TEST_IDS.createBranchDialog.submit) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
  });
});

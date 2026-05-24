import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ScopeButtonGroup from "@/components/atoms/buttons/ScopeButtonGroup";
import { RepoAddScope } from "@/lib/constants/repoAddScope.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ScopeButtonGroup", () => {
  it("calls onChange with the next scope when the user toggles", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <ScopeButtonGroup value={RepoAddScope.LOCAL} onChange={onChange} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.repos.addScope.global));
    expect(onChange).toHaveBeenCalledWith(RepoAddScope.GLOBAL);
  });
});

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ActivitySourceToggle from "@/components/atoms/buttons/ActivitySourceToggle";
import { ActivitySource } from "@/lib/constants/activity.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

describe("ActivitySourceToggle", () => {
  it("calls onChange with the next source when the user toggles", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <ActivitySourceToggle value={ActivitySource.ALL} onChange={onChange} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.activity.sourceToggle.remote));
    expect(onChange).toHaveBeenCalledWith(ActivitySource.REMOTE);
  });

  it("ignores a click on the already-selected segment", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <ActivitySourceToggle value={ActivitySource.ALL} onChange={onChange} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.activity.sourceToggle.all));
    expect(onChange).not.toHaveBeenCalled();
  });
});

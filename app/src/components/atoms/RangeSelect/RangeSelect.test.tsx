import type { ActivityRange } from "@recrest/shared";

import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import RangeSelect from "@/components/atoms/RangeSelect";
import { ACTIVITY_RANGE_DAY_MS } from "@/lib/constants/activity.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

// A ~30-day range so the dropdown opens with "30d" pre-selected.
const RANGE: ActivityRange = {
  since: "2026-05-10T00:00:00.000Z",
  until: "2026-06-09T00:00:00.000Z",
};

function windowDays(range: ActivityRange): number {
  return Math.round((Date.parse(range.until) - Date.parse(range.since)) / ACTIVITY_RANGE_DAY_MS);
}

describe("RangeSelect", () => {
  it("emits a fixed-window range for the picked preset", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <RangeSelect value={RANGE} onChange={onChange} oldestDate={null} />,
    );
    fireEvent.mouseDown(getByTestId(TEST_IDS.sidebar.rangeSelect));
    fireEvent.click(getByTestId(TEST_IDS.sidebar.rangeOption("7d")));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(windowDays(onChange.mock.calls[0]![0] as ActivityRange)).toBe(7);
  });

  it("does not emit for 'all' while the oldest date is unknown", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <RangeSelect value={RANGE} onChange={onChange} oldestDate={null} />,
    );
    fireEvent.mouseDown(getByTestId(TEST_IDS.sidebar.rangeSelect));
    fireEvent.click(getByTestId(TEST_IDS.sidebar.rangeOption("all")));

    expect(onChange).not.toHaveBeenCalled();
  });

  it("emits an oldest→now range for 'all' once the oldest date is known", () => {
    const onChange = vi.fn();
    const oldest = "2024-01-01T00:00:00.000Z";
    const { getByTestId } = renderWithProviders(
      <RangeSelect value={RANGE} onChange={onChange} oldestDate={oldest} />,
    );
    fireEvent.mouseDown(getByTestId(TEST_IDS.sidebar.rangeSelect));
    fireEvent.click(getByTestId(TEST_IDS.sidebar.rangeOption("all")));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ since: oldest }));
  });
});

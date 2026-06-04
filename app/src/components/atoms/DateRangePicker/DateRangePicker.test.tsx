import { fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import DateRangePicker from "@/components/atoms/DateRangePicker";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { renderWithProviders } from "@/test/utils";

const DAY_MS = 86_400_000;

function rangeOfDays(days: number) {
  const now = Date.now();
  return {
    since: new Date(now - days * DAY_MS).toISOString(),
    until: new Date(now).toISOString(),
  };
}

function dayDiff(since: string, until: string): number {
  return Math.round((new Date(until).getTime() - new Date(since).getTime()) / DAY_MS);
}

describe("DateRangePicker", () => {
  it("renders all five presets and the root", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(30)} onChange={onChange} oldestDate={null} />,
    );
    expect(getByTestId(TEST_IDS.activity.rangePicker.root)).toBeInTheDocument();
    for (const key of ["7d", "30d", "90d", "1y", "all"]) {
      expect(getByTestId(TEST_IDS.activity.rangePicker.preset(key))).toBeInTheDocument();
    }
  });

  it("fires onChange with a ~90-day range when the 90d preset is clicked", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(30)} onChange={onChange} oldestDate={null} />,
    );
    fireEvent.click(getByTestId(TEST_IDS.activity.rangePicker.preset("90d")));
    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0];
    expect(dayDiff(next.since, next.until)).toBe(90);
  });

  it("disables the all preset without oldestDate", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(30)} onChange={onChange} oldestDate={null} />,
    );
    expect(getByTestId(TEST_IDS.activity.rangePicker.preset("all"))).toBeDisabled();
  });

  it("enables the all preset with oldestDate and uses it as since", () => {
    const onChange = vi.fn();
    const oldest = new Date("2024-01-01T00:00:00.000Z").toISOString();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(30)} onChange={onChange} oldestDate={oldest} />,
    );
    const allBtn = getByTestId(TEST_IDS.activity.rangePicker.preset("all"));
    expect(allBtn).not.toBeDisabled();
    fireEvent.click(allBtn);
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0]![0].since).toBe(oldest);
  });

  it("visually marks the matching preset for an exactly-30-day range", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(30)} onChange={onChange} oldestDate={null} />,
    );
    expect(getByTestId(TEST_IDS.activity.rangePicker.preset("30d"))).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(getByTestId(TEST_IDS.activity.rangePicker.preset("7d"))).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("marks no preset for a custom 45-day range", () => {
    const onChange = vi.fn();
    const { getByTestId } = renderWithProviders(
      <DateRangePicker value={rangeOfDays(45)} onChange={onChange} oldestDate={null} />,
    );
    for (const key of ["7d", "30d", "90d", "1y", "all"]) {
      expect(getByTestId(TEST_IDS.activity.rangePicker.preset(key))).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
  });
});

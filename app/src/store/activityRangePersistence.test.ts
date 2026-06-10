import { configureStore } from "@reduxjs/toolkit";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ACTIVITY_RANGE_DAY_MS } from "@/lib/constants/activity.constants";
import { StorageKey } from "@/lib/constants/storage.constants";
import { setSelectedRange } from "@/store/actions/activity.actions";
import {
  activityRangePersistMiddleware,
  loadPersistedRange,
} from "@/store/activityRangePersistence";
import { activityReducer } from "@/store/reducers/activityReducer";

const NOW = new Date("2026-06-09T12:00:00.000Z");

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

function widthDays(since: string, until: string): number {
  return Math.round((Date.parse(until) - Date.parse(since)) / ACTIVITY_RANGE_DAY_MS);
}

describe("loadPersistedRange", () => {
  it("returns null when nothing is stored", () => {
    expect(loadPersistedRange()).toBeNull();
  });

  it("recomputes a fixed preset relative to now", () => {
    localStorage.setItem(
      StorageKey.ACTIVITY_RANGE,
      JSON.stringify({
        key: "30d",
        since: "2020-01-01T00:00:00.000Z",
        until: "2020-01-31T00:00:00.000Z",
      }),
    );
    const range = loadPersistedRange();
    expect(range).not.toBeNull();
    expect(range!.until).toBe(NOW.toISOString());
    expect(widthDays(range!.since, range!.until)).toBe(30);
  });

  it("keeps the saved start for `all` but refreshes the end to now", () => {
    const oldest = "2024-01-01T00:00:00.000Z";
    localStorage.setItem(
      StorageKey.ACTIVITY_RANGE,
      JSON.stringify({ key: "all", since: oldest, until: "2025-01-01T00:00:00.000Z" }),
    );
    expect(loadPersistedRange()).toEqual({ since: oldest, until: NOW.toISOString() });
  });

  it("restores a custom range verbatim", () => {
    const stored = {
      key: null,
      since: "2026-02-01T00:00:00.000Z",
      until: "2026-03-01T00:00:00.000Z",
    };
    localStorage.setItem(StorageKey.ACTIVITY_RANGE, JSON.stringify(stored));
    expect(loadPersistedRange()).toEqual({ since: stored.since, until: stored.until });
  });

  it("returns null for an unreadable blob", () => {
    localStorage.setItem(StorageKey.ACTIVITY_RANGE, "not json");
    expect(loadPersistedRange()).toBeNull();
  });
});

describe("activityRangePersistMiddleware", () => {
  it("writes the matched preset key when the range changes", () => {
    const store = configureStore({
      reducer: { activity: activityReducer },
      middleware: (g) => g().concat(activityRangePersistMiddleware),
    });
    const since = new Date(NOW.getTime() - 90 * ACTIVITY_RANGE_DAY_MS).toISOString();
    store.dispatch(setSelectedRange({ since, until: NOW.toISOString() }));

    const blob = JSON.parse(localStorage.getItem(StorageKey.ACTIVITY_RANGE) ?? "{}");
    expect(blob).toMatchObject({ key: "90d", since, until: NOW.toISOString() });
  });
});

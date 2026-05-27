import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { timeAgo } from "@/lib/utils/timeAgo.utils";

describe("timeAgo", () => {
  const NOW = new Date("2026-05-24T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns em-dash for invalid input", () => {
    expect(timeAgo("not-a-date")).toBe("—");
  });

  it("returns 'just now' under one minute", () => {
    expect(timeAgo(new Date(NOW - 30 * 1000).toISOString())).toBe("just now");
  });

  it("returns minutes between 1 minute and 1 hour", () => {
    expect(timeAgo(new Date(NOW - 5 * 60 * 1000).toISOString())).toBe("5 min ago");
  });

  it("returns hours between 1 hour and 1 day", () => {
    expect(timeAgo(new Date(NOW - 3 * 3600 * 1000).toISOString())).toBe("3 hr ago");
  });

  it("returns days beyond 1 day", () => {
    expect(timeAgo(new Date(NOW - 2 * 86400 * 1000).toISOString())).toBe("2 d ago");
  });
});

import { DateFormat, TimeFormat } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatAbsolute,
  formatRange,
  formatRelative,
  formatTimeOnly,
  formatTimestamp,
  resolveLocale,
} from "@/lib/utils/datetime.utils";

const FIXED_NOW = new Date("2026-01-05T14:32:00.000Z").getTime();

// A UTC reference moment used across the absolute-format suites. Picked at
// 12:32 UTC so the local-time conversion stays in-day across CET (UTC+1) /
// CEST (UTC+2) — the tests run in whichever zone the host machine is in, and
// Intl uses the host zone unless we override per-call.
const REF_UTC = new Date("2026-01-05T14:32:00.000Z");
function localExpected(locale: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat(locale, opts).format(REF_UTC);
}
function localHHMM(timeFormat: TimeFormat): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: timeFormat === TimeFormat.TWELVE_HOUR,
  }).format(REF_UTC);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("resolveLocale", () => {
  it("falls back to the base language when no region is set", () => {
    expect(resolveLocale("en", null)).toBe("en");
    expect(resolveLocale("de", null)).toBe("de");
  });

  it("suffixes a region code when one is supplied", () => {
    expect(resolveLocale("en", "GB")).toBe("en-GB");
    expect(resolveLocale("de", "AT")).toBe("de-AT");
  });

  it("strips an existing region suffix off the base language", () => {
    expect(resolveLocale("en-US", "GB")).toBe("en-GB");
  });
});

describe("formatRelative", () => {
  it("renders a localized 'minutes ago' phrasing in English", () => {
    const twoMinAgo = new Date(FIXED_NOW - 2 * 60 * 1000);
    expect(formatRelative(twoMinAgo, "en")).toBe("2 minutes ago");
  });

  it("localizes to the given locale (German)", () => {
    const twoHoursAgo = new Date(FIXED_NOW - 2 * 60 * 60 * 1000);
    expect(formatRelative(twoHoursAgo, "de")).toBe("vor 2 Stunden");
  });

  it("returns — for unparseable input", () => {
    expect(formatRelative("not-a-date" as unknown as string, "en")).toBe("—");
  });
});

describe("formatAbsolute — en-US", () => {
  it("renders a 12-hour clock for en-US", () => {
    const out = formatAbsolute(new Date("2026-01-05T14:32:00.000Z"), {
      locale: "en-US",
      timeFormat: TimeFormat.TWELVE_HOUR,
    });
    // Node 22 Intl: "Jan 5, 2026, 2:32 PM" — we only assert the meaningful pieces.
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/2026/);
    expect(out.toUpperCase()).toMatch(/PM/);
  });

  it("renders a 24-hour clock for en-US", () => {
    const out = formatAbsolute(REF_UTC, {
      locale: "en-US",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toContain(localHHMM(TimeFormat.TWENTY_FOUR_HOUR));
    expect(out).not.toMatch(/AM|PM/i);
  });
});

describe("formatAbsolute — en-GB", () => {
  it("uses day-first ordering for en-GB", () => {
    const out = formatAbsolute(REF_UTC, {
      locale: "en-GB",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toMatch(/Jan/);
    expect(out).toMatch(/5/);
    expect(out).toContain(localHHMM(TimeFormat.TWENTY_FOUR_HOUR));
  });
});

describe("formatAbsolute — de-DE", () => {
  it("renders dd.mm.yyyy with a 24h clock", () => {
    const out = formatAbsolute(REF_UTC, {
      locale: "de-DE",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toEqual(
      localExpected("de-DE", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    );
  });
});

describe("formatTimeOnly", () => {
  it("respects the 12h preference", () => {
    const out = formatTimeOnly(REF_UTC, {
      locale: "en-US",
      timeFormat: TimeFormat.TWELVE_HOUR,
    });
    expect(out.toUpperCase()).toMatch(/AM|PM/);
  });

  it("respects the 24h preference", () => {
    const out = formatTimeOnly(REF_UTC, {
      locale: "en-US",
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toBe(localHHMM(TimeFormat.TWENTY_FOUR_HOUR));
  });
});

describe("formatTimestamp", () => {
  it("falls through to the relative bucket regardless of timeFormat", () => {
    const twoMinAgo = new Date(FIXED_NOW - 2 * 60 * 1000);
    expect(
      formatTimestamp(twoMinAgo, {
        locale: "en-US",
        dateFormat: DateFormat.RELATIVE,
        timeFormat: TimeFormat.TWELVE_HOUR,
      }),
    ).toBe("2 minutes ago");
    expect(
      formatTimestamp(twoMinAgo, {
        locale: "en-US",
        dateFormat: DateFormat.RELATIVE,
        timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      }),
    ).toBe("2 minutes ago");
  });

  it("uses the absolute formatter for a concrete (non-relative) preset", () => {
    const out = formatTimestamp(REF_UTC, {
      locale: "en-US",
      dateFormat: DateFormat.MEDIUM,
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toContain(localHHMM(TimeFormat.TWENTY_FOUR_HOUR));
    expect(out).toMatch(/2026/);
  });

  it("renders ISO preset as YYYY-MM-DD", () => {
    const out = formatTimestamp(REF_UTC, {
      locale: "en-US",
      dateFormat: DateFormat.ISO,
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2} /);
  });

  it("honours an explicit time zone", () => {
    const tokyo = formatTimestamp(REF_UTC, {
      locale: "en-US",
      dateFormat: DateFormat.ISO,
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timeZone: "Asia/Tokyo",
    });
    const utc = formatTimestamp(REF_UTC, {
      locale: "en-US",
      dateFormat: DateFormat.ISO,
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      timeZone: "UTC",
    });
    expect(tokyo).not.toBe(utc);
  });
});

describe("formatRange", () => {
  it("collapses a same-day range to a single date", () => {
    expect(formatRange("2026-06-18", "2026-06-18", "en-US")).toBe("Jun 18, 2026");
  });

  it("collapses the shared year onto the end date", () => {
    expect(formatRange("2026-05-28", "2026-06-08", "en-US")).toBe("May 28 – Jun 8, 2026");
  });

  it("keeps both years on a cross-year range", () => {
    expect(formatRange("2025-12-30", "2026-01-02", "en-US")).toBe("Dec 30, 2025 – Jan 2, 2026");
  });

  it("localizes month names to the given locale", () => {
    expect(formatRange("2026-06-18", "2026-06-18", "de-DE")).toBe("18. Juni 2026");
  });

  it("treats date-only inputs as calendar dates — no timezone shift moves the day", () => {
    // 2026-06-18 read as local midnight must stay June 18 regardless of host
    // zone; a naive `new Date("2026-06-18")` (UTC midnight) would slip a day
    // west of UTC. We assert the rendered day is 18, not 17.
    expect(formatRange("2026-06-18", "2026-06-18", "en-US")).toContain("18");
  });

  it("falls back to the raw 'start – end' string on unparseable input", () => {
    expect(formatRange("nope", "also-nope", "en-US")).toBe("nope – also-nope");
  });
});

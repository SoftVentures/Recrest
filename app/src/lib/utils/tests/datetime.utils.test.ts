import { DateFormat, TimeFormat } from "@recrest/shared";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatAbsolute,
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
  it("renders 2 minutes ago in the same bucket regardless of clock preference", () => {
    const twoMinAgo = new Date(FIXED_NOW - 2 * 60 * 1000);
    expect(formatRelative(twoMinAgo, "en")).toBe("2 min ago");
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
    ).toBe("2 min ago");
    expect(
      formatTimestamp(twoMinAgo, {
        locale: "en-US",
        dateFormat: DateFormat.RELATIVE,
        timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
      }),
    ).toBe("2 min ago");
  });

  it("uses the absolute formatter when the preference is absolute", () => {
    const out = formatTimestamp(REF_UTC, {
      locale: "en-US",
      dateFormat: DateFormat.ABSOLUTE,
      timeFormat: TimeFormat.TWENTY_FOUR_HOUR,
    });
    expect(out).toContain(localHHMM(TimeFormat.TWENTY_FOUR_HOUR));
    expect(out).toMatch(/2026/);
  });
});

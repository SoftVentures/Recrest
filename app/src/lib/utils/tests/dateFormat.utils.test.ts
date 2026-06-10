import { describe, expect, it } from "vitest";

import { formatDateRange } from "@/lib/utils/dateFormat.utils";

describe("formatDateRange", () => {
  it("renders a localized range with the shared year collapsed onto the end", () => {
    const out = formatDateRange("2026-05-28", "2026-06-08");
    expect(out).toContain("–");
    expect(out).toContain("28");
    expect(out).toContain("8");
    // Year appears once (collapsed), and the raw ISO key is gone.
    expect(out).toContain("2026");
    expect(out).not.toContain("2026-05-28");
    expect(out.match(/2026/g)).toHaveLength(1);
  });

  it("keeps both years for a cross-year range", () => {
    const out = formatDateRange("2025-12-30", "2026-01-02");
    expect(out).toContain("2025");
    expect(out).toContain("2026");
  });

  it("renders a single date for a same-day range", () => {
    const out = formatDateRange("2026-05-28", "2026-05-28");
    expect(out).not.toContain("–");
    expect(out).toContain("28");
  });

  it("reads date-only keys as local midnight (no off-by-one day)", () => {
    // The day number must survive the parse regardless of timezone.
    expect(formatDateRange("2026-05-28", "2026-05-28")).toContain("28");
  });

  it("falls back to the raw string when a bound is unparseable", () => {
    expect(formatDateRange("not-a-date", "2026-06-08")).toBe("not-a-date – 2026-06-08");
  });
});

import { describe, expect, it } from "vitest";

import { formatBytes, formatNumber } from "@/lib/utils/format.utils";

describe("formatBytes", () => {
  it("returns '0 B' for zero and invalid inputs", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
    expect(formatBytes(Infinity)).toBe("0 B");
  });

  it("renders bytes with no decimals below 1 KiB", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1023)).toBe("1023 B");
  });

  it("scales through KB/MB/GB", () => {
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(2048)).toBe("2.00 KB");
    expect(formatBytes(1_572_864)).toBe("1.50 MB");
    expect(formatBytes(1024 * 1024 * 1024)).toBe("1.00 GB");
  });

  it("uses one decimal once the value is >=10 in its unit", () => {
    expect(formatBytes(10 * 1024)).toBe("10.0 KB");
    expect(formatBytes(50 * 1024 * 1024)).toBe("50.0 MB");
  });
});

describe("formatNumber", () => {
  it("groups thousands per locale instead of per host default", () => {
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
    // NBSP-agnostic: de-DE groups with dots.
    expect(formatNumber(1234567, "de")).toBe("1.234.567");
  });

  it("uses the locale's decimal separator", () => {
    expect(formatNumber(1234.5, "en")).toBe("1,234.5");
    expect(formatNumber(1234.5, "de")).toBe("1.234,5");
  });

  it("honours a region-qualified tag", () => {
    expect(formatNumber(1234, "en-US")).toBe("1,234");
    expect(formatNumber(1234, "de-DE")).toBe("1.234");
    // de-AT groups with a narrow no-break space, de-DE with a dot — the region
    // subtag has to survive, not just the language.
    expect(formatNumber(1234, "de-AT")).not.toBe(formatNumber(1234, "de-DE"));
  });

  it("passes Intl options through", () => {
    expect(formatNumber(0.256, "en", { style: "percent", maximumFractionDigits: 1 })).toBe("25.6%");
  });

  it("defaults to en and survives a malformed locale tag", () => {
    expect(formatNumber(1234)).toBe("1,234");
    expect(formatNumber(1234, "")).toBe("1,234");
    expect(formatNumber(1234, "not-a-locale!!")).toBe("1,234");
  });

  it("collapses non-finite input to an em dash", () => {
    expect(formatNumber(NaN, "en")).toBe("—");
    expect(formatNumber(Infinity, "en")).toBe("—");
  });
});

import { describe, expect, it } from "vitest";

import { formatBytes } from "@/lib/utils/format.utils";

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

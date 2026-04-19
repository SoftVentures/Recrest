import { describe, expect, it } from "vitest";

import { osLabel } from "./useOsDetect";

describe("osLabel", () => {
  it("maps known platforms to display strings", () => {
    expect(osLabel("macos")).toBe("macOS");
    expect(osLabel("windows")).toBe("Windows");
    expect(osLabel("linux")).toBe("Linux");
  });

  it("falls back for unknown platforms", () => {
    expect(osLabel("unknown")).toBe("your platform");
  });
});

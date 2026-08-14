import { describe, expect, it } from "vitest";

import { isThrottleElapsed } from "@/lib/utils/throttle.utils";

describe("isThrottleElapsed", () => {
  it("always allows the first run", () => {
    expect(isThrottleElapsed(null, 1000, 0)).toBe(true);
  });

  it("blocks a second run inside the window", () => {
    expect(isThrottleElapsed(1000, 2000, 2999)).toBe(false);
  });

  it("allows a run exactly at the window boundary", () => {
    expect(isThrottleElapsed(1000, 2000, 3000)).toBe(true);
  });

  it("allows a run after the window elapsed", () => {
    expect(isThrottleElapsed(1000, 2000, 9999)).toBe(true);
  });

  it("treats a zero interval as no throttling", () => {
    expect(isThrottleElapsed(1000, 0, 1000)).toBe(true);
  });

  it("defaults `now` to the current clock", () => {
    expect(isThrottleElapsed(Date.now(), 60_000)).toBe(false);
    expect(isThrottleElapsed(Date.now() - 120_000, 60_000)).toBe(true);
  });
});

import { describe, expect, it } from "vitest";

import { StatusTone, toneChip, toneText } from "@/lib/utils/toneColor.utils";
import { getTheme } from "@/theme";

const light = getTheme("light");
const dark = getTheme("dark");

describe("toneChip", () => {
  it("uses the dark shade for text on a light theme", () => {
    expect(toneChip(light, StatusTone.SUCCESS).color).toBe(light.palette.success.dark);
  });

  it("flips to the light shade for text on a dark theme (readable on a dark tint)", () => {
    expect(toneChip(dark, StatusTone.SUCCESS).color).toBe(dark.palette.success.light);
    expect(toneChip(dark, StatusTone.SUCCESS).color).not.toBe(dark.palette.success.dark);
  });

  it("builds a faint color-mix background from the main shade", () => {
    const { backgroundColor } = toneChip(dark, StatusTone.ERROR, 20);
    expect(backgroundColor).toContain("color-mix");
    expect(backgroundColor).toContain("20%");
    expect(backgroundColor).toContain(dark.palette.error.main);
  });
});

describe("toneText", () => {
  it("flips shade by theme mode", () => {
    expect(toneText(dark, StatusTone.WARNING)).toBe(dark.palette.warning.light);
    expect(toneText(light, StatusTone.WARNING)).toBe(light.palette.warning.dark);
  });
});

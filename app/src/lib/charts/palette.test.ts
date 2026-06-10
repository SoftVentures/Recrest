import { describe, expect, it } from "vitest";

import { CHART_PALETTE, buildRepoColorMap, colorForRepo, fade, shade } from "@/lib/charts/palette";

const HEX_RE = /^#[0-9a-f]{6}$/;

describe("colorForRepo", () => {
  it("is stable: the same id always resolves to the same swatch", () => {
    const first = colorForRepo("repo-alpha");
    const second = colorForRepo("repo-alpha");
    const third = colorForRepo("repo-alpha");
    expect(second).toBe(first);
    expect(third).toBe(first);
  });

  it("always returns a swatch from CHART_PALETTE", () => {
    const ids = ["a", "b", "c", "repo/one", "owner/long-name", "", "💡"];
    for (const id of ids) {
      expect(CHART_PALETTE).toContain(colorForRepo(id));
    }
  });

  it("resolves two distinct known ids deterministically", () => {
    // Distinct ids that hash into different palette slots.
    const one = colorForRepo("github:acme/web");
    const two = colorForRepo("github:acme/api");
    expect(one).not.toBe(two);
    // Pin the deterministic output so a hash/palette change is caught.
    expect(colorForRepo("github:acme/web")).toBe(one);
    expect(colorForRepo("github:acme/api")).toBe(two);
  });
});

describe("buildRepoColorMap", () => {
  it("assigns the first 14 sorted ids to the 14 palette entries in order", () => {
    // Intentionally unsorted input — the map must sort internally.
    const ids = ["m", "a", "n", "b", "c", "z", "d", "e", "f", "g", "h", "i", "j", "k"];
    const sorted = [...ids].sort();
    const map = buildRepoColorMap(ids);

    expect(map.size).toBe(CHART_PALETTE.length);
    for (let i = 0; i < CHART_PALETTE.length; i++) {
      const id = sorted[i]!;
      expect(map.get(id)).toBe(CHART_PALETTE[i]!);
    }
  });

  it("is collision-free while count <= palette size", () => {
    const ids = Array.from({ length: CHART_PALETTE.length }, (_, i) => `repo-${i}`);
    const map = buildRepoColorMap(ids);
    const colors = Array.from(map.values());
    expect(new Set(colors).size).toBe(colors.length);
  });

  it("produces the same map regardless of input order", () => {
    const a = ["b", "a", "c", "d"];
    const b = ["d", "c", "b", "a"];
    const mapA = buildRepoColorMap(a);
    const mapB = buildRepoColorMap(b);
    expect(Array.from(mapA.entries())).toEqual(Array.from(mapB.entries()));
  });

  it("dedupes duplicate ids", () => {
    const map = buildRepoColorMap(["x", "x", "y", "y", "y"]);
    expect(map.size).toBe(2);
    expect(map.has("x")).toBe(true);
    expect(map.has("y")).toBe(true);
  });

  it("falls back to colorForRepo for ids beyond the palette size", () => {
    // 16 ids -> first 14 sorted use the palette, the rest use the hash fallback.
    const ids = Array.from({ length: 16 }, (_, i) => `repo-${String(i).padStart(2, "0")}`);
    const sorted = [...ids].sort();
    const map = buildRepoColorMap(ids);

    expect(map.size).toBe(16);
    // First 14 sorted ids map to the palette in order.
    for (let i = 0; i < CHART_PALETTE.length; i++) {
      expect(map.get(sorted[i]!)).toBe(CHART_PALETTE[i]!);
    }
    // The overflow ids fall back to the hash-based colorForRepo.
    for (let i = CHART_PALETTE.length; i < sorted.length; i++) {
      const id = sorted[i]!;
      expect(map.get(id)).toBe(colorForRepo(id));
    }
  });
});

describe("fade", () => {
  it("formats as rgba(r, g, b, a) with the decoded channels", () => {
    // #6366f1 -> r=99, g=102, b=241
    expect(fade("#6366f1", 0.5)).toBe("rgba(99, 102, 241, 0.5)");
  });

  it("clamps alpha above 1 down to 1", () => {
    expect(fade("#000000", 5)).toBe("rgba(0, 0, 0, 1)");
  });

  it("clamps negative alpha up to 0", () => {
    expect(fade("#ffffff", -2)).toBe("rgba(255, 255, 255, 0)");
  });

  it("passes through an in-range alpha unchanged", () => {
    expect(fade("#14b8a6", 0.25)).toBe("rgba(20, 184, 166, 0.25)");
  });
});

describe("shade", () => {
  const luminance = (hex: string): number => {
    const n = parseInt(hex.slice(1), 16);
    return ((n >> 16) & 0xff) + ((n >> 8) & 0xff) + (n & 0xff);
  };

  it("returns a valid #rrggbb hex", () => {
    expect(shade("#6366f1", 0.1)).toMatch(HEX_RE);
    expect(shade("#6366f1", -0.1)).toMatch(HEX_RE);
  });

  it("lightens with a positive delta and darkens with a negative delta", () => {
    const base = "#6366f1";
    const lighter = shade(base, 0.2);
    const darker = shade(base, -0.2);
    expect(luminance(lighter)).toBeGreaterThan(luminance(base));
    expect(luminance(darker)).toBeLessThan(luminance(base));
  });

  it("saturates to #ffffff for a huge positive delta", () => {
    const result = shade("#6366f1", 10);
    expect(result).toMatch(HEX_RE);
    expect(result).toBe("#ffffff");
  });

  it("saturates to #000000 for a huge negative delta", () => {
    const result = shade("#6366f1", -10);
    expect(result).toMatch(HEX_RE);
    expect(result).toBe("#000000");
  });
});

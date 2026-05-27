import type { LanguageSlice } from "@/lib/activityAggregates";

export interface DonutArc {
  slice: LanguageSlice;
  path: string;
}

/**
 * Builds the SVG path segments for a donut chart from an ordered slice array.
 * Starts at 12 o'clock and walks clockwise; each path is a pie wedge that the
 * SVG layer can clip with an inner circle to produce the donut hole.
 */
export function donutArcs(
  mix: LanguageSlice[],
  radius: number,
  cx: number,
  cy: number,
): DonutArc[] {
  const arcs: DonutArc[] = [];
  let cursor = -Math.PI / 2;
  for (const slice of mix) {
    const angle = slice.share * 2 * Math.PI;
    const end = cursor + angle;
    const x1 = cx + Math.cos(cursor) * radius;
    const y1 = cy + Math.sin(cursor) * radius;
    const x2 = cx + Math.cos(end) * radius;
    const y2 = cy + Math.sin(end) * radius;
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
    arcs.push({ slice, path });
    cursor = end;
  }
  return arcs;
}

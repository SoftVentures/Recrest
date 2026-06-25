import { createElement } from "react";

import { renderToStaticMarkup } from "react-dom/server";

import type { LucideIcon } from "lucide-react";

/**
 * Builds a standalone 64×64 SVG of a white lucide icon centred on a two-stop
 * gradient (or solid, when both stops match). The lucide component is rendered
 * to markup and its inner shapes are re-wrapped in a positioned `<g>` so the
 * stroke colour/width is controlled here rather than inherited from lucide's
 * `currentColor` default — that keeps the saved file self-contained (no CSS
 * `color` to resolve).
 *
 * The result is saved verbatim as the repo's custom avatar via
 * `set_repo_logo_svg`, so it must be a complete, namespaced SVG document.
 */
export function buildAvatarSvg(stops: readonly [string, string], Icon: LucideIcon): string {
  const raw = renderToStaticMarkup(createElement(Icon, { strokeWidth: 2 }));
  // lucide renders `<svg …>…shapes…</svg>`; keep only the inner shapes so we can
  // place + stroke them ourselves inside the gradient tile.
  const inner = raw.replace(/^<svg\b[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  const [c1, c2] = stops;
  // lucide icons use a 24-unit viewBox. scale 1.4 → ~34px glyph centred in the
  // 64px tile (offset (64 − 24·1.4) / 2 ≈ 15.2). stroke-width 1.6 ÷ scale keeps
  // the visible stroke near lucide's native 2px.
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">` +
    `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c2}"/>` +
    `</linearGradient></defs>` +
    `<rect width="64" height="64" rx="14" ry="14" fill="url(#bg)"/>` +
    `<g transform="translate(15.2,15.2) scale(1.4)" fill="none" stroke="#ffffff" ` +
    `stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</g>` +
    `</svg>`
  );
}

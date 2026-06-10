/**
 * DOM `data-*` attributes that drive the diff's selection + comment highlight.
 *
 * The band is painted by toggling these attributes directly on line elements
 * (no React re-render — keeps large diffs smooth), which means the same
 * attribute names appear in two places: the `styled()` CSS selectors in
 * `DiffView.styles.tsx` and the imperative paint/read code in `DiffView`.
 * Keeping them here stops the two from drifting on a raw string.
 */
export const DIFF_ATTR = {
  /** File path the line belongs to (scopes a selection to one file). */
  path: "data-diff-path",
  /** `CommentSide` the line anchors on. */
  side: "data-diff-side",
  /** Old-file line number (empty when the line has none). */
  oldLine: "data-diff-old",
  /** New-file line number (empty when the line has none). */
  newLine: "data-diff-new",
  /** Render-order index used to order/highlight a (possibly cross-side) range. */
  seq: "data-diff-seq",
  /** Strong live band painted while dragging a selection. */
  selected: "data-sel",
  /** Gentle tint painted while hovering a posted comment's card. */
  highlight: "data-hl",
} as const;

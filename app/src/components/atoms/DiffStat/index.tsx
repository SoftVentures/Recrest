import type { CSSProperties } from "react";

const DIFF_STYLE: CSSProperties = {
  fontFamily: "var(--font-mono)",
  fontSize: 11,
  fontVariantNumeric: "tabular-nums",
  display: "inline-flex",
  gap: 6,
};

interface DiffStatProps {
  added: number;
  removed: number;
}

/** Mini "+12 −53" line stat. Returns null when there are no changes. */
export function DiffStat({ added, removed }: DiffStatProps) {
  if (!added && !removed) return null;
  return (
    <span style={DIFF_STYLE}>
      {added > 0 && <span style={{ color: "var(--green)" }}>+{added}</span>}
      {removed > 0 && <span style={{ color: "var(--red)" }}>−{removed}</span>}
    </span>
  );
}

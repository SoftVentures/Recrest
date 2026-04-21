interface DiffStatProps {
  added: number;
  removed: number;
}

/** Mini "+12 −53" line stat. Returns null when there are no changes. */
export function DiffStat({ added, removed }: DiffStatProps) {
  if (!added && !removed) return null;
  return (
    <span className="inline-flex gap-1.5 font-mono text-[11px] tabular-nums">
      {added > 0 && <span className="text-(--green)">+{added}</span>}
      {removed > 0 && <span className="text-(--red)">−{removed}</span>}
    </span>
  );
}

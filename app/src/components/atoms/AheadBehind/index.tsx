interface AheadBehindProps {
  ahead: number;
  behind: number;
  compact?: boolean;
}

/** Branch ahead/behind counter chip. Returns null in compact mode when the
 *  branch is even with its upstream; otherwise shows a grey "↕ 0" pill. */
export function AheadBehind({ ahead, behind, compact }: AheadBehindProps) {
  if (!ahead && !behind) {
    return compact ? null : (
      <span className="ab-chip">
        <span className="ab-zero">↕ 0</span>
      </span>
    );
  }
  return (
    <span className="ab-chip">
      {ahead > 0 && <span className="ab-up">↑{ahead}</span>}
      {behind > 0 && <span className="ab-down">↓{behind}</span>}
    </span>
  );
}

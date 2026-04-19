import type { ReactNode } from "react";

interface MrChipProps {
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  /** Optional trailing counter (hidden when null/0). */
  count?: number | null;
}

/** Filter chip used in the Merge Requests page header (Open / Draft /
 *  Merged / Closed). Visually matches the branches-page chip but keyed off
 *  a different CSS class so they can diverge later. */
export function MrChip({ active, onClick, children, count }: MrChipProps) {
  return (
    <button type="button" className={`a-mr-chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
      {count != null && count > 0 && <span className="a-mr-chip-count">{count}</span>}
    </button>
  );
}

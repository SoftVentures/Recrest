import type { ReactNode } from "react";

interface BranchFilterChipProps {
  active: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
}

/** Pill-style filter chip for the Branches page filter row. Shows the label
 *  next to an optional counter. The active variant uses the accent colour. */
export function BranchFilterChip({ active, onClick, count, children }: BranchFilterChipProps) {
  return (
    <button type="button" className={`a-br-chip${active ? " active" : ""}`} onClick={onClick}>
      {children}
      {count != null && <span>{count}</span>}
    </button>
  );
}

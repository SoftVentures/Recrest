import { Icon } from "@/components/atoms/Icon";

interface BranchChipProps {
  branch: string;
  size?: "sm" | "md" | "big";
}

/** Rounded pill showing a branch name with the branch icon on the left.
 *  Three visual sizes mirror the usage across dashboard (big), row lists
 *  (md) and compact inline chips (sm). */
export function BranchChip({ branch, size = "md" }: BranchChipProps) {
  const cls = `a-branch-chip${size === "sm" ? " sm" : size === "big" ? " big" : ""}`;
  const iconSize = size === "sm" ? 10 : size === "big" ? 12 : 11;
  return (
    <span className={cls}>
      <Icon name="branch" size={iconSize} />
      <span>{branch}</span>
    </span>
  );
}

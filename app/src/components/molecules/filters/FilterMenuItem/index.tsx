import { type ReactNode } from "react";

import { ListItemIcon, ListItemText } from "@mui/material";

import { Check } from "lucide-react";

import {
  AvatarSlot,
  CountSpan,
  FilterItem,
  LeadingSlot,
} from "@/components/molecules/filters/FilterMenuItem/FilterMenuItem.styles";
import { pxToRem } from "@/theme/scale";

export interface FilterMenuItemProps {
  /** Display label for the row */
  label: string;
  /** Optional trailing count badge */
  count?: number;
  /** Whether this row is in the active filter set (shows a leading check) */
  active: boolean;
  onSelect: () => void;
  /** Small leading icon next to the label (e.g. lucide icon). Mutually
   *  exclusive with `avatar` — pick one. */
  icon?: ReactNode;
  /** Avatar slot (AuthorAvatar / RepoAvatar). When present, replaces the
   *  icon slot — used by the MR filter to show repo + author avatars. */
  avatar?: ReactNode;
  "data-testid"?: string;
  "aria-pressed"?: boolean;
}

/** Single row inside a Menu-based filter popover. Pattern shared between the
 *  Branches and MergeRequests filters: leading check slot, optional icon or
 *  avatar, label, trailing count badge. */
export default function FilterMenuItem({
  label,
  count,
  active,
  onSelect,
  icon,
  avatar,
  "data-testid": testId,
  "aria-pressed": ariaPressed,
}: FilterMenuItemProps) {
  return (
    <FilterItem
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
      data-testid={testId}
      aria-pressed={ariaPressed}
    >
      <LeadingSlot component="span" variant="caption">
        {active && <Check size={pxToRem(14)} />}
      </LeadingSlot>
      {avatar ? <AvatarSlot>{avatar}</AvatarSlot> : icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={label} />
      {count !== undefined && (
        <CountSpan component="span" variant="caption">
          {count}
        </CountSpan>
      )}
    </FilterItem>
  );
}

export {
  CountSpan,
  FilterItem,
  LeadingSlot,
} from "@/components/molecules/filters/FilterMenuItem/FilterMenuItem.styles";
export { SectionLabel } from "@/components/molecules/filters/FilterMenuItem/FilterMenuItem.styles";

import { type ReactNode } from "react";

import { ListItemIcon, ListItemText } from "@mui/material";

import { Check } from "lucide-react";

import {
  FilterItem,
  LeadingSlot,
  RadioDot,
} from "@/pages/app/Repos/parts/ChipItem/ChipItem.styles";
import { pxToRem } from "@/theme/scale";

export interface ChipItemProps {
  label: string;
  active: boolean;
  onSelect: () => void;
  icon?: ReactNode;
  /** `"check"` for boolean status filters, `"radio"` for the sort group. */
  indicator?: "check" | "radio";
  testId?: string;
}

export function ChipItem({
  label,
  active,
  onSelect,
  icon,
  indicator = "check",
  testId,
}: ChipItemProps) {
  return (
    <FilterItem
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
      data-active={active ? "true" : undefined}
      data-testid={testId}
    >
      <LeadingSlot component="span" variant="caption">
        {active &&
          (indicator === "check" ? (
            <Check size={pxToRem(16)} />
          ) : (
            <RadioDot component="span" variant="caption" />
          ))}
      </LeadingSlot>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={label} />
    </FilterItem>
  );
}

export default ChipItem;

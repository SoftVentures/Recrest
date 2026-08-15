import { type ReactNode } from "react";

import { ListItemIcon, ListItemText } from "@mui/material";

import { Check } from "lucide-react";

import { CountSpan, FilterItem, LeadingSlot } from "@/pages/app/Branches/parts/_shared";
import { pxToRem } from "@/theme/scale";

export interface PopoverChipProps {
  label: string;
  count?: number;
  active: boolean;
  onSelect: () => void;
  icon?: ReactNode;
}

export function PopoverChip({ label, count, active, onSelect, icon }: PopoverChipProps) {
  return (
    <FilterItem
      onClick={(e) => {
        e.preventDefault();
        onSelect();
      }}
    >
      <LeadingSlot component="span" variant="caption">
        {active && <Check size={pxToRem(14)} />}
      </LeadingSlot>
      {icon && <ListItemIcon>{icon}</ListItemIcon>}
      <ListItemText primary={label} />
      {count !== undefined && (
        <CountSpan component="span" variant="caption">
          {count}
        </CountSpan>
      )}
    </FilterItem>
  );
}

export default PopoverChip;

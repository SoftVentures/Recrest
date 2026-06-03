import { type ReactNode } from "react";

import { Menu } from "@mui/material";

import {
  DangerItem,
  Item,
  ListItemIcon,
  ListItemText,
  PrimaryItem,
  Separator,
} from "@/components/molecules/menus/ContextMenu/ContextMenu.styles";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface ContextMenuItem {
  /** Stable key for list rendering. */
  key: string;
  /** Visible label. */
  label: string;
  /** Optional leading icon (lucide). */
  icon?: ReactNode;
  /** Visual emphasis: `primary` highlights the row as the canonical action
   *  (used by the "Open detail page" entry at the top). `danger` uses the
   *  red error palette. Default: regular. */
  variant?: "primary" | "danger";
  /** Disable the row (greyed, no click). */
  disabled?: boolean;
  /** Click handler. Closes the menu before firing. */
  onSelect: () => void;
}

export interface ContextMenuSection {
  /** Items rendered as a contiguous block. Sections are separated by a
   *  divider. Empty arrays are filtered out so callers can conditionally
   *  build sections without manual emptiness checks. */
  items: ContextMenuItem[];
}

interface Props {
  /** `{ left, top }` viewport coordinates (from a `contextmenu` event), or
   *  `null` to keep the menu closed. */
  position: { left: number; top: number } | null;
  onClose: () => void;
  sections: ContextMenuSection[];
  "data-testid"?: string;
}

/** Right-click menu primitive. Anchored to a viewport coordinate rather than
 *  an element ref so it works on `<div role="button">` rows and `<Box>`
 *  cards without ref forwarding. Renders sections separated by dividers;
 *  the first item of the first section is conventionally the primary
 *  "Open detail page" affordance. */
export default function ContextMenu({ position, onClose, sections, "data-testid": testId }: Props) {
  const open = position !== null;
  const handle = (fn: () => void) => () => {
    onClose();
    fn();
  };

  const visibleSections = sections.filter((s) => s.items.length > 0);

  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={position ?? undefined}
      slotProps={{
        paper: { "data-testid": testId } as React.HTMLAttributes<HTMLElement>,
      }}
    >
      {visibleSections.flatMap((section, sIdx) => {
        const rows = section.items.map((item) => {
          const Cmp =
            item.variant === "danger"
              ? DangerItem
              : item.variant === "primary"
                ? PrimaryItem
                : Item;
          return (
            <Cmp
              key={item.key}
              onClick={handle(item.onSelect)}
              disabled={item.disabled}
              data-testid={TEST_IDS.contextMenu.item(item.key)}
            >
              {item.icon && <ListItemIcon>{item.icon}</ListItemIcon>}
              <ListItemText>{item.label}</ListItemText>
            </Cmp>
          );
        });
        return sIdx < visibleSections.length - 1
          ? [...rows, <Separator key={`sep-${sIdx}`} />]
          : rows;
      })}
    </Menu>
  );
}

import type { HTMLAttributes } from "react";

import { useTranslation } from "react-i18next";

import { Box, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { ActivityRange } from "@recrest/shared";

import { CalendarRange } from "lucide-react";

import { ACTIVITY_RANGE_ALL_KEY, ACTIVITY_RANGE_PRESETS } from "@/lib/constants/activity.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { presetKeyFromRange, rangeFromPresetKey } from "@/lib/utils/activityRange.utils";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

export interface RangeSelectProps {
  value: ActivityRange;
  onChange: (next: ActivityRange) => void;
  oldestDate: string | null;
  /**
   * `expanded` (default) renders a full-width labelled dropdown.
   * `collapsed` renders an icon-only trigger that still opens the same menu,
   * so the control fits inside the narrow collapsed sidebar.
   */
  variant?: "expanded" | "collapsed";
}

interface StyledProps {
  collapsed: boolean;
}

const SHOULD_FORWARD = (prop: PropertyKey) => prop !== "collapsed";

const StyledSelect = styled(Select, { shouldForwardProp: SHOULD_FORWARD })<StyledProps>(
  ({ theme, collapsed }) => ({
    // Collapsed: a 38×38 chip that matches the sidebar's footer nav items
    // (same square, border, transparent surface, hover tint). Expanded: a
    // full-width labelled dropdown on the elevated surface.
    minHeight: collapsed ? pxToRem(38) : pxToRem(32),
    width: collapsed ? pxToRem(38) : "100%",
    fontSize: fontPxToRem(12),
    color: theme.palette.text.primary,
    backgroundColor: collapsed ? "transparent" : theme.palette.surface.interface.backElevation,
    borderRadius: 8,
    transition: "background-color 120ms ease, border-color 120ms ease",
    "& .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.divider,
    },
    "&:hover": collapsed ? { backgroundColor: theme.palette.surface.interface.active } : undefined,
    "&:hover .MuiOutlinedInput-notchedOutline": {
      borderColor: theme.palette.border.hover,
    },
    "& .MuiSelect-select": {
      padding: collapsed ? "0 !important" : pxToRems(4, 10),
      display: "flex",
      alignItems: "center",
      justifyContent: collapsed ? "center" : "flex-start",
      gap: pxToRem(8),
      minHeight: "0 !important",
    },
    // Hide the dropdown caret when collapsed so the icon stays centred.
    "& .MuiSelect-icon": collapsed ? { display: "none" } : undefined,
  }),
);

const Trigger = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  fontSize: fontPxToRem(12),
  minWidth: 0,
}) as typeof Box;

const TriggerLabel = styled(Box)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Box;

function RangeSelect({ value, onChange, oldestDate, variant = "expanded" }: RangeSelectProps) {
  const { t } = useTranslation();
  const collapsed = variant === "collapsed";
  const selected = presetKeyFromRange(value, oldestDate);

  const handleChange = (event: SelectChangeEvent<unknown>) => {
    const next = rangeFromPresetKey(event.target.value as string, oldestDate);
    if (next) onChange(next);
  };

  const labelFor = (key: string | null) =>
    key ? t(`activity.range.preset_${key}`) : t("activity.range.preset_all");

  return (
    <StyledSelect
      collapsed={collapsed}
      value={selected ?? ""}
      displayEmpty
      size="small"
      onChange={handleChange}
      aria-label={t("activity.range", { ns: I18nNamespace.ARIA })}
      SelectDisplayProps={
        { "data-testid": TEST_IDS.sidebar.rangeSelect } as HTMLAttributes<HTMLDivElement>
      }
      renderValue={() => (
        <Trigger>
          <CalendarRange size={pxToRem(14)} aria-hidden />
          {!collapsed && <TriggerLabel>{labelFor(selected)}</TriggerLabel>}
        </Trigger>
      )}
    >
      {ACTIVITY_RANGE_PRESETS.map((preset) => (
        <MenuItem
          key={preset.key}
          value={preset.key}
          data-testid={TEST_IDS.sidebar.rangeOption(preset.key)}
        >
          {t(`activity.range.preset_${preset.key}`)}
        </MenuItem>
      ))}
      <MenuItem
        value={ACTIVITY_RANGE_ALL_KEY}
        disabled={!oldestDate}
        data-testid={TEST_IDS.sidebar.rangeOption(ACTIVITY_RANGE_ALL_KEY)}
      >
        {t("activity.range.preset_all")}
      </MenuItem>
    </StyledSelect>
  );
}

export default RangeSelect;

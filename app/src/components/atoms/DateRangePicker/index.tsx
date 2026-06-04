import { useTranslation } from "react-i18next";

import type { ActivityRange } from "@recrest/shared";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

const DAY_MS = 86_400_000;

const ALL_KEY = "all";

interface Preset {
  key: string;
  days: number;
}

const PRESETS: Preset[] = [
  { key: "7d", days: 7 },
  { key: "30d", days: 30 },
  { key: "90d", days: 90 },
  { key: "1y", days: 365 },
];

export interface DateRangePickerProps {
  value: ActivityRange;
  onChange: (next: ActivityRange) => void;
  oldestDate: string | null;
}

/**
 * Derive which segment is highlighted from the current range. The window
 * width maps to a preset whose `days` matches within ±1 (clocks/DST drift).
 * `all` wins when the range starts at/before the oldest commit. A custom
 * URL-injected range matches nothing, so no segment is highlighted.
 */
function selectedKey(value: ActivityRange, oldestDate: string | null): string | null {
  if (oldestDate && value.since <= oldestDate) return ALL_KEY;
  const windowDays = Math.round((Date.parse(value.until) - Date.parse(value.since)) / DAY_MS);
  const match = PRESETS.find((preset) => Math.abs(preset.days - windowDays) <= 1);
  return match ? match.key : null;
}

function DateRangePicker({ value, onChange, oldestDate }: DateRangePickerProps) {
  const { t } = useTranslation();
  const selected = selectedKey(value, oldestDate);

  const handleChange = (_: unknown, key: string | null) => {
    // Ignore null: clicking the active segment must not clear the range.
    if (!key) return;
    if (key === ALL_KEY) {
      if (!oldestDate) return;
      onChange({ since: oldestDate, until: new Date().toISOString() });
      return;
    }
    const preset = PRESETS.find((p) => p.key === key);
    if (!preset) return;
    const now = Date.now();
    onChange({
      since: new Date(now - preset.days * DAY_MS).toISOString(),
      until: new Date(now).toISOString(),
    });
  };

  return (
    <GeneralButtonGroup
      exclusive
      value={selected}
      shape="square"
      density="sm"
      onChange={handleChange}
      data-testid={TEST_IDS.activity.rangePicker.root}
    >
      {PRESETS.map((preset) => (
        <GeneralButtonGroupItem
          key={preset.key}
          value={preset.key}
          data-testid={TEST_IDS.activity.rangePicker.preset(preset.key)}
        >
          {t(`activity.range.preset_${preset.key}`)}
        </GeneralButtonGroupItem>
      ))}
      <GeneralButtonGroupItem
        value={ALL_KEY}
        disabled={!oldestDate}
        data-testid={TEST_IDS.activity.rangePicker.preset(ALL_KEY)}
      >
        {t("activity.range.preset_all")}
      </GeneralButtonGroupItem>
    </GeneralButtonGroup>
  );
}

export default DateRangePicker;

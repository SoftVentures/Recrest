import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";

import { Globe, Monitor } from "lucide-react";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";
import { ActivitySource } from "@/lib/constants/activity.constants";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export interface ActivitySourceToggleProps {
  value: ActivitySource;
  onChange: (next: ActivitySource) => void;
}

/**
 * Switches the Activity page between every scanned repo (`all`) and only those
 * backed by a connected remote provider (`remote`). Same small segmented form
 * the time picker used to occupy in the header.
 */
function ActivitySourceToggle({ value, onChange }: ActivitySourceToggleProps) {
  const { t } = useTranslation();
  const allLabel = t("activity.source.all");
  const remoteLabel = t("activity.source.remote");

  const handleChange = (_: unknown, next: ActivitySource | null) => {
    if (next) onChange(next);
  };

  return (
    <GeneralButtonGroup
      value={value}
      exclusive
      shape="square"
      density="sm"
      onChange={handleChange}
      aria-label={t("activity.source", { ns: I18nNamespace.ARIA })}
      data-testid={TEST_IDS.activity.sourceToggle.root}
    >
      <GeneralButtonGroupItem
        value={ActivitySource.ALL}
        aria-label={allLabel}
        data-testid={TEST_IDS.activity.sourceToggle.all}
      >
        <Monitor size={14} aria-hidden />
        <Box component="span">{allLabel}</Box>
      </GeneralButtonGroupItem>
      <GeneralButtonGroupItem
        value={ActivitySource.REMOTE}
        aria-label={remoteLabel}
        data-testid={TEST_IDS.activity.sourceToggle.remote}
      >
        <Globe size={14} aria-hidden />
        <Box component="span">{remoteLabel}</Box>
      </GeneralButtonGroupItem>
    </GeneralButtonGroup>
  );
}

export default ActivitySourceToggle;

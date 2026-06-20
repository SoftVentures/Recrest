import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import Kbd, { KbdSize } from "@/components/atoms/inputs/Kbd";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { SHORTCUTS, SHORTCUT_GROUP, type ShortcutGroup } from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const Keys = styled(Box)({
  display: "inline-flex",
  gap: 4,
}) as typeof Box;

const SECTIONS: { group: ShortcutGroup; titleKey: string; testId: string }[] = [
  {
    group: SHORTCUT_GROUP.NAVIGATION,
    titleKey: "settings.shortcuts.navigation",
    testId: TEST_IDS.settings.shortcuts.navigation,
  },
  {
    group: SHORTCUT_GROUP.ACTIONS,
    titleKey: "settings.shortcuts.actions",
    testId: TEST_IDS.settings.shortcuts.actions,
  },
];

export function ShortcutsSection() {
  const { t } = useTranslation();
  const platform = usePlatform();

  return (
    <>
      {SECTIONS.map((section) => (
        <SettingsSection key={section.group} title={t(section.titleKey)} testId={section.testId}>
          {SHORTCUTS.filter((s) => s.group === section.group).map((s) => {
            // Single letters read better capitalised on the keycap; digits and
            // punctuation are unaffected by toUpperCase().
            const combo = formatShortcut(platform, {
              ...s.combo,
              key: s.combo.key.toUpperCase(),
            });
            return (
              <SettingsRow key={s.id} label={t(s.labelKey)}>
                <Keys>
                  <Kbd size={KbdSize.MD}>{combo}</Kbd>
                </Keys>
              </SettingsRow>
            );
          })}
        </SettingsSection>
      ))}
    </>
  );
}

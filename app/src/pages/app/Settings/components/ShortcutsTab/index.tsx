import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import Kbd, { KbdSize } from "@/components/atoms/inputs/Kbd";
import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const Keys = styled(Box)({
  display: "inline-flex",
  gap: 4,
}) as typeof Box;

interface Row {
  label: string;
  keys: string[];
}

export function ShortcutsSection() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const fmt = (k: Parameters<typeof formatShortcut>[1]) => formatShortcut(platform, k);

  const navigation: Row[] = [
    { label: t("settings.shortcuts.jump"), keys: [fmt({ mod: true, key: "K" })] },
    { label: t("settings.shortcuts.next_prev_repo"), keys: ["↓", "↑"] },
    { label: t("settings.shortcuts.toggle_detail"), keys: [fmt({ mod: true, key: "]" })] },
  ];

  const gitOps: Row[] = [
    { label: t("settings.shortcuts.pull"), keys: [fmt({ mod: true, shift: true, key: "P" })] },
    { label: t("settings.shortcuts.fetch_all"), keys: [fmt({ mod: true, key: "F" })] },
  ];

  const editorOps: Row[] = [
    { label: t("settings.shortcuts.open_editor"), keys: [fmt({ mod: true, key: "↵" })] },
    { label: t("settings.shortcuts.open_terminal"), keys: [fmt({ mod: true, key: "T" })] },
    {
      label: t("settings.shortcuts.open_settings"),
      keys: [fmt({ mod: true, key: "," })],
    },
  ];

  return (
    <>
      <SettingsSection title={t("settings.shortcuts.navigation")}>
        {navigation.map((r) => (
          <SettingsRow key={r.label} label={r.label}>
            <Keys>
              {r.keys.map((k, i) => (
                <Kbd size={KbdSize.MD} key={i}>
                  {k}
                </Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection title={t("settings.shortcuts.git")}>
        {gitOps.map((r) => (
          <SettingsRow key={r.label} label={r.label}>
            <Keys>
              {r.keys.map((k, i) => (
                <Kbd size={KbdSize.MD} key={i}>
                  {k}
                </Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection title={t("settings.shortcuts.editor")}>
        {editorOps.map((r) => (
          <SettingsRow key={r.label} label={r.label}>
            <Keys>
              {r.keys.map((k, i) => (
                <Kbd size={KbdSize.MD} key={i}>
                  {k}
                </Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>
    </>
  );
}

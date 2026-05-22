import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { formatShortcut, usePlatform } from "@/hooks/usePlatform";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const Keys = styled(Box)({
  display: "inline-flex",
  gap: 4,
});

const Kbd = styled("span")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 6px",
  borderRadius: 8,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 10.5,
  fontWeight: 600,
  fontFamily: "inherit",
}));

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
      label: t("settings.shortcuts.open_settings", { defaultValue: "Open settings" }),
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
                <Kbd key={i}>{k}</Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection title={t("settings.shortcuts.git", { defaultValue: "Git operations" })}>
        {gitOps.map((r) => (
          <SettingsRow key={r.label} label={r.label}>
            <Keys>
              {r.keys.map((k, i) => (
                <Kbd key={i}>{k}</Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>

      <SettingsSection
        title={t("settings.shortcuts.editor", { defaultValue: "Editor & terminal" })}
      >
        {editorOps.map((r) => (
          <SettingsRow key={r.label} label={r.label}>
            <Keys>
              {r.keys.map((k, i) => (
                <Kbd key={i}>{k}</Kbd>
              ))}
            </Keys>
          </SettingsRow>
        ))}
      </SettingsSection>
    </>
  );
}

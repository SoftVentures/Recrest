import { useTranslation } from "react-i18next";

import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from "@mui/material";

import { THEMES, type ThemeId } from "@/lib/constants/theme.constants";
import { setThemeId } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

export interface ThemeSwitcherButtonProps {
  /** Optional label override. Defaults to i18n `settings:theme.themeSelect`. */
  label?: string;
}

function ThemeSwitcherButton({ label }: ThemeSwitcherButtonProps) {
  const { t } = useTranslation("settings");
  const themeId = useAppSelector((s) => s.settings.themeId);
  const dispatch = useAppDispatch();

  const handleChange = (e: SelectChangeEvent<string>) => {
    dispatch(setThemeId(e.target.value as ThemeId));
  };

  const labelText = label ?? t("theme.themeSelect");

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="theme-switcher-label">{labelText}</InputLabel>
      <Select
        labelId="theme-switcher-label"
        id="theme-switcher"
        value={themeId}
        label={labelText}
        onChange={handleChange}
      >
        {THEMES.map((tm) => (
          <MenuItem key={tm.id} value={tm.id}>
            {t(`theme.themes.${tm.id}`, { defaultValue: tm.label })}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export default ThemeSwitcherButton;

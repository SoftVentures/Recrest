import { useTranslation } from "react-i18next";

import { Box, MenuItem, type SelectChangeEvent } from "@mui/material";
import { styled } from "@mui/material/styles";

import {
  CUSTOM_FONT_PREFIX,
  type FontSelection,
  type FontSizeId,
  MONO_FONT_IDS,
  SANS_FONT_IDS,
} from "@recrest/shared";

import { AArrowDown, AArrowUp, ALargeSmall, Type } from "lucide-react";

import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  codeLigatureFeatureSettings,
  fontCssFamily,
  fontLabel,
  fontSizeLabel,
} from "@/lib/utils/appearance.utils";
import { CustomFontRow } from "@/pages/app/Settings/components/GeneralTab/sections/FontsSection/parts/CustomFontRow";
import { SelectControl } from "@/pages/app/Settings/components/GeneralTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  setCodeFont,
  setCodeLigatures,
  setFont,
  setFontSize,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fontPxToRem, pxToRem } from "@/theme/scale";

const FONT_SIZE_IDS: FontSizeId[] = ["sm", "md", "lg", "xl"];

const FONT_SIZE_ICONS: Record<FontSizeId, typeof Type> = {
  sm: AArrowDown,
  md: ALargeSmall,
  lg: Type,
  xl: AArrowUp,
};

const FontSelect = styled(SelectControl)({ minWidth: pxToRem(220) });
const FontSizeSelect = styled(SelectControl)({ minWidth: pxToRem(180) });

const MenuLabel = styled(Box)(({ theme }) => ({
  display: "inline-block",
  marginLeft: theme.spacing(1),
}));

// eslint-disable-next-line no-restricted-syntax -- semantic <li> inside MUI Select listbox; Box would break a11y
const FontGroupLabel = styled("li", {
  shouldForwardProp: (p) => p !== "withDivider",
})<{ withDivider?: boolean }>(({ theme, withDivider }) => ({
  fontSize: fontPxToRem(10),
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  padding: `${theme.spacing(1)} ${theme.spacing(2)}`,
  pointerEvents: "none",
  listStyle: "none",
  borderTop: withDivider ? `1px solid ${theme.palette.divider}` : undefined,
  marginTop: withDivider ? theme.spacing(0.5) : undefined,
}));

export function FontsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const font = useAppSelector((s) => s.settings.font);
  const codeFont = useAppSelector((s) => s.settings.codeFont);
  const codeLigatures = useAppSelector((s) => s.settings.codeLigatures);
  const customFonts = useAppSelector((s) => s.settings.customFonts);
  const fontSize = useAppSelector((s) => s.settings.fontSize);

  return (
    <SettingsSection title={t("settings.sections.fonts")}>
      <SettingsRow label={t("settings.fields.font")} sub={t("settings.fields.font_sub")}>
        <FontSelect
          size="small"
          value={font}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFont(e.target.value as FontSelection))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.font") } }}
          data-testid={TEST_IDS.settings.general.fontSelect}
          renderValue={(value) => (
            <Box component="span" style={{ fontFamily: fontCssFamily(value as FontSelection) }}>
              {fontLabel(value as FontSelection)}
            </Box>
          )}
        >
          <FontGroupLabel>{t("font_groups.sans", { ns: I18nNamespace.SETTINGS })}</FontGroupLabel>
          {SANS_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.fontOption(f)}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {fontLabel(f)}
              </Box>
            </MenuItem>
          ))}
          <FontGroupLabel withDivider>
            {t("font_groups.monospace", { ns: I18nNamespace.SETTINGS })}
          </FontGroupLabel>
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.fontOption(f)}>
              <Box component="span" style={{ fontFamily: fontCssFamily(f) }}>
                {fontLabel(f)}
              </Box>
            </MenuItem>
          ))}
          {customFonts.length > 0 && (
            <FontGroupLabel withDivider>
              {t("font_groups.custom", { ns: I18nNamespace.SETTINGS })}
            </FontGroupLabel>
          )}
          {customFonts.map((cf) => {
            const value = `${CUSTOM_FONT_PREFIX}${cf.family}`;
            return (
              <MenuItem
                key={value}
                value={value}
                data-testid={TEST_IDS.settings.general.fontOption(value)}
              >
                <Box component="span" style={{ fontFamily: fontCssFamily(value) }}>
                  {cf.family}
                </Box>
              </MenuItem>
            );
          })}
        </FontSelect>
      </SettingsRow>

      <SettingsRow label={t("settings.fields.code_font")} sub={t("settings.fields.code_font_sub")}>
        <FontSelect
          size="small"
          value={codeFont}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setCodeFont(e.target.value as FontSelection))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.code_font") } }}
          data-testid={TEST_IDS.settings.general.codeFontSelect}
          renderValue={(value) => (
            <Box
              component="span"
              style={{
                fontFamily: fontCssFamily(value as FontSelection, "mono"),
                fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
              }}
            >
              {fontLabel(value as FontSelection)}
            </Box>
          )}
        >
          {MONO_FONT_IDS.map((f) => (
            <MenuItem key={f} value={f} data-testid={TEST_IDS.settings.general.codeFontOption(f)}>
              <Box
                component="span"
                style={{
                  fontFamily: fontCssFamily(f, "mono"),
                  fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
                }}
              >
                {fontLabel(f)} &nbsp; =&gt; != &gt;=
              </Box>
            </MenuItem>
          ))}
          {customFonts.length > 0 && (
            <FontGroupLabel withDivider>
              {t("font_groups.custom", { ns: I18nNamespace.SETTINGS })}
            </FontGroupLabel>
          )}
          {customFonts.map((cf) => {
            const value = `${CUSTOM_FONT_PREFIX}${cf.family}`;
            return (
              <MenuItem
                key={value}
                value={value}
                data-testid={TEST_IDS.settings.general.codeFontOption(value)}
              >
                <Box
                  component="span"
                  style={{
                    fontFamily: fontCssFamily(value, "mono"),
                    fontFeatureSettings: codeLigatureFeatureSettings(codeLigatures),
                  }}
                >
                  {cf.family} &nbsp; =&gt; != &gt;=
                </Box>
              </MenuItem>
            );
          })}
        </FontSelect>
      </SettingsRow>

      <SettingsRow
        label={t("settings.fields.code_ligatures")}
        sub={t("settings.fields.code_ligatures_sub")}
      >
        <GeneralSwitchInput
          checked={codeLigatures !== "off"}
          onCheckedChange={(next) => dispatch(setCodeLigatures(next ? "standard" : "off"))}
          aria-label={t("settings.fields.code_ligatures")}
          data-testid={TEST_IDS.settings.general.codeLigaturesSwitch}
        />
      </SettingsRow>

      <CustomFontRow />

      <SettingsRow label={t("settings.fields.font_size")} sub={t("settings.fields.font_size_sub")}>
        <FontSizeSelect
          size="small"
          value={fontSize}
          onChange={(e: SelectChangeEvent<unknown>) =>
            dispatch(setFontSize(e.target.value as FontSizeId))
          }
          slotProps={{ input: { "aria-label": t("settings.fields.font_size") } }}
          data-testid={TEST_IDS.settings.general.fontSizeSelect}
          renderValue={(value) => {
            const Icon = FONT_SIZE_ICONS[value as FontSizeId];
            return (
              <>
                <Icon size={pxToRem(13)} />
                {fontSizeLabel(value as FontSizeId)}
              </>
            );
          }}
        >
          {FONT_SIZE_IDS.map((sz) => {
            const Icon = FONT_SIZE_ICONS[sz];
            return (
              <MenuItem key={sz} value={sz}>
                <Icon size={pxToRem(13)} />
                <MenuLabel>{fontSizeLabel(sz)}</MenuLabel>
              </MenuItem>
            );
          })}
        </FontSizeSelect>
      </SettingsRow>
    </SettingsSection>
  );
}

export default FontsSection;

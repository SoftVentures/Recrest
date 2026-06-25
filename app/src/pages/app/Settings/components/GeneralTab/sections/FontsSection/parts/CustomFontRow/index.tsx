import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { CUSTOM_FONT_PREFIX, DEFAULT_CODE_FONT, DEFAULT_FONT } from "@recrest/shared";

import { Trash2, Upload } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { fontCssFamily } from "@/lib/utils/appearance.utils";
import { pickFontFile } from "@/lib/utils/pickFolder.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";
import { SettingsRow } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  deleteCustomFont,
  setCodeFont,
  setFont,
  uploadCustomFont,
} from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

const Content = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: theme.spacing(1),
}));

const Chips = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "flex-end",
  gap: theme.spacing(0.75),
  maxWidth: 280,
}));

const Chip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: theme.spacing(0.5),
  paddingLeft: theme.spacing(1),
  borderRadius: 999,
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  fontSize: 12,
  maxWidth: "100%",
})) as typeof Box;

const ChipLabel = styled(Typography)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
}) as typeof Typography;

export function CustomFontRow() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const customFonts = useAppSelector((s) => s.settings.customFonts);
  const font = useAppSelector((s) => s.settings.font);
  const codeFont = useAppSelector((s) => s.settings.codeFont);
  const upload = useActionFeedback();

  const onUpload = async () => {
    if (!isTauri()) return;
    // Pick outside `run` so cancelling the dialog doesn't flash a success check.
    const path = await pickFontFile();
    if (!path) return;
    try {
      await upload.run(() => dispatch(uploadCustomFont(path)).unwrap());
    } catch {
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
    }
  };

  const onDelete = async (id: string) => {
    try {
      await dispatch(deleteCustomFont(id)).unwrap();
      // If the deleted font was the active UI / code selection, fall back to
      // the defaults so the picker doesn't hold a dangling `custom:` value.
      const selection = `${CUSTOM_FONT_PREFIX}${id}`;
      if (font === selection) dispatch(setFont(DEFAULT_FONT));
      if (codeFont === selection) dispatch(setCodeFont(DEFAULT_CODE_FONT));
    } catch {
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
    }
  };

  return (
    <SettingsRow
      label={t("settings.fields.custom_fonts")}
      sub={t("settings.fields.custom_fonts_sub")}
    >
      <Content>
        <GeneralButton
          variant="outline"
          onClick={() => void onUpload()}
          feedbackState={upload.state}
          disabled={!isTauri()}
          startIcon={<Upload size={14} />}
          data-testid={TEST_IDS.settings.general.customFontUpload}
        >
          {t("settings.fields.custom_fonts_upload")}
        </GeneralButton>
        {customFonts.length > 0 && (
          <Chips>
            {customFonts.map((font) => (
              <Chip key={font.id} data-testid={TEST_IDS.settings.general.customFontChip(font.id)}>
                <ChipLabel
                  component="span"
                  style={{ fontFamily: fontCssFamily(`${CUSTOM_FONT_PREFIX}${font.family}`) }}
                >
                  {font.family}
                </ChipLabel>
                <GeneralIconButton
                  icon={<Trash2 size={12} />}
                  size={IconButtonSize.XS}
                  variant="ghost"
                  tone="danger"
                  aria-label={`${t("settings.fields.custom_fonts_remove")} ${font.family}`}
                  onClick={() => void onDelete(font.id)}
                  data-testid={TEST_IDS.settings.general.customFontDelete(font.id)}
                />
              </Chip>
            ))}
          </Chips>
        )}
      </Content>
    </SettingsRow>
  );
}

export default CustomFontRow;

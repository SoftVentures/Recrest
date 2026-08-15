import { useTranslation } from "react-i18next";

import { Edit3, RotateCcw, X } from "lucide-react";

import GeneralIconButton, {
  IconButtonShape,
  IconButtonSize,
} from "@/components/atoms/buttons/GeneralIconButton";
import Kbd, { KbdSize } from "@/components/atoms/inputs/Kbd";
import { type Platform, formatShortcut } from "@/hooks/usePlatform";
import { type ShortcutDef } from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsRow } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  FeedbackText,
  Keys,
  RecordingChip,
  RowActions,
} from "@/pages/app/Settings/components/ShortcutsTab/ShortcutsTab.styles";
import { pxToRem } from "@/theme/scale";

export interface ShortcutRowProps {
  def: ShortcutDef;
  platform: Platform;
  isRecording: boolean;
  isOverridden: boolean;
  /** Already-translated error message shown under the label while recording
   *  (combo conflict / missing modifier), or null. */
  feedbackMessage: string | null;
  onEdit: () => void;
  onReset: () => void;
}

export default function ShortcutRow({
  def,
  platform,
  isRecording,
  isOverridden,
  feedbackMessage,
  onEdit,
  onReset,
}: ShortcutRowProps) {
  const { t } = useTranslation();

  // Single letters read better capitalised on the keycap; digits and
  // punctuation are unaffected by toUpperCase().
  const combo = formatShortcut(platform, { ...def.combo, key: def.combo.key.toUpperCase() });

  const sub = isRecording ? (
    <FeedbackText component="span" data-testid={TEST_IDS.settings.shortcuts.feedback(def.id)}>
      {feedbackMessage ?? t("settings.shortcuts.recording_hint")}
    </FeedbackText>
  ) : undefined;

  return (
    <SettingsRow label={t(def.labelKey)} sub={sub}>
      <RowActions data-testid={TEST_IDS.settings.shortcuts.row(def.id)}>
        {isRecording ? (
          <RecordingChip data-testid={TEST_IDS.settings.shortcuts.recording(def.id)}>
            {t("settings.shortcuts.recording")}
          </RecordingChip>
        ) : (
          <Keys>
            <Kbd size={KbdSize.MD}>{combo}</Kbd>
          </Keys>
        )}
        {isOverridden && !isRecording && (
          <GeneralIconButton
            size={IconButtonSize.SM}
            shape={IconButtonShape.CIRCLE}
            aria-label={t("settings.shortcuts.reset")}
            data-testid={TEST_IDS.settings.shortcuts.reset(def.id)}
            onClick={onReset}
            icon={<RotateCcw size={pxToRem(13)} aria-hidden />}
          />
        )}
        <GeneralIconButton
          size={IconButtonSize.SM}
          shape={IconButtonShape.CIRCLE}
          aria-label={t("settings.shortcuts.edit")}
          data-testid={TEST_IDS.settings.shortcuts.edit(def.id)}
          onClick={onEdit}
          icon={
            isRecording ? (
              <X size={pxToRem(13)} aria-hidden />
            ) : (
              <Edit3 size={pxToRem(13)} aria-hidden />
            )
          }
        />
      </RowActions>
    </SettingsRow>
  );
}

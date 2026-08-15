import { useCallback, useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { RotateCcw } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { usePlatform } from "@/hooks/usePlatform";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { PLATFORM_MODIFIER_LABELS } from "@/lib/constants/platform.constants";
import {
  SHORTCUT_GROUP,
  type ShortcutGroup,
  type ShortcutId,
} from "@/lib/constants/shortcuts.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  comboFromEvent,
  comboHasModifier,
  findComboConflict,
  resolveShortcuts,
} from "@/lib/utils/shortcuts.utils";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { ResetAllBar } from "@/pages/app/Settings/components/ShortcutsTab/ShortcutsTab.styles";
import ShortcutRow from "@/pages/app/Settings/components/ShortcutsTab/parts/ShortcutRow";
import {
  resetAllShortcuts,
  resetShortcut,
  setShortcutOverride,
} from "@/store/actions/shortcuts.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { pxToRem } from "@/theme/scale";

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

interface Feedback {
  id: ShortcutId;
  message: string;
}

export function ShortcutsSection() {
  const { t } = useTranslation();
  const platform = usePlatform();
  const dispatch = useAppDispatch();
  const overrides = useAppSelector((s) => s.shortcuts.overrides);
  const resolved = useMemo(() => resolveShortcuts(overrides), [overrides]);
  const hasOverrides = Object.keys(overrides).length > 0;

  const [recordingId, setRecordingId] = useState<ShortcutId | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const modLabel = PLATFORM_MODIFIER_LABELS[platform].mod;

  // While recording, capture the next key chord on the window's capture phase
  // and `stopImmediatePropagation` so the global binding hook (a bubble-phase
  // window listener) never fires the combo being recorded. Every key is trapped
  // (incl. Tab/arrows) until Escape cancels or a valid combo commits — that's
  // deliberate, so a stray key can't navigate away mid-capture.
  useEffect(() => {
    if (recordingId == null) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.key === KEYBOARD_KEYS.ESCAPE) {
        setRecordingId(null);
        setFeedback(null);
        return;
      }
      const combo = comboFromEvent(e);
      if (!combo) return; // lone modifier — keep waiting
      if (!comboHasModifier(combo)) {
        setFeedback({
          id: recordingId,
          message: t("settings.shortcuts.need_modifier", { mod: modLabel }),
        });
        return;
      }
      const conflict = findComboConflict(resolved, recordingId, combo);
      if (conflict) {
        setFeedback({
          id: recordingId,
          message: t("settings.shortcuts.conflict", { name: t(conflict.labelKey) }),
        });
        return;
      }
      dispatch(setShortcutOverride({ id: recordingId, combo }));
      setRecordingId(null);
      setFeedback(null);
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [recordingId, resolved, dispatch, t, modLabel]);

  const handleEdit = useCallback((id: ShortcutId) => {
    setFeedback(null);
    setRecordingId((current) => (current === id ? null : id));
  }, []);

  const handleReset = useCallback(
    (id: ShortcutId) => {
      if (recordingId === id) setRecordingId(null);
      setFeedback(null);
      dispatch(resetShortcut(id));
    },
    [dispatch, recordingId],
  );

  const handleResetAll = useCallback(() => {
    setRecordingId(null);
    setFeedback(null);
    dispatch(resetAllShortcuts());
  }, [dispatch]);

  return (
    <>
      {SECTIONS.map((section) => (
        <SettingsSection key={section.group} title={t(section.titleKey)} testId={section.testId}>
          {resolved
            .filter((s) => s.group === section.group)
            .map((s) => (
              <ShortcutRow
                key={s.id}
                def={s}
                platform={platform}
                isRecording={recordingId === s.id}
                isOverridden={overrides[s.id] != null}
                feedbackMessage={feedback?.id === s.id ? feedback.message : null}
                onEdit={() => handleEdit(s.id)}
                onReset={() => handleReset(s.id)}
              />
            ))}
        </SettingsSection>
      ))}
      {hasOverrides && (
        <ResetAllBar>
          <GeneralButton
            variant="ghost"
            size="sm"
            startIcon={<RotateCcw size={pxToRem(14)} aria-hidden />}
            onClick={handleResetAll}
            data-testid={TEST_IDS.settings.shortcuts.resetAll}
          >
            {t("settings.shortcuts.reset_all")}
          </GeneralButton>
        </ResetAllBar>
      )}
    </>
  );
}

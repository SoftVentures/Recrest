import { useState } from "react";

import { useTranslation } from "react-i18next";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  ButtonRow,
  SelectNative,
  TextInput,
} from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const KNOWN_FLAGS = [
  {
    name: "newRepoRow",
    labelKey: "developer.flags.known_new_repo_row",
    kind: "boolean" as const,
    def: false,
  },
  {
    name: "activityV2",
    labelKey: "developer.flags.known_activity_v2",
    kind: "boolean" as const,
    def: false,
  },
  {
    name: "trayBadgeColor",
    labelKey: "developer.flags.known_tray_badge_color",
    kind: "enum" as const,
    options: [
      { value: "auto", labelKey: "developer.flags.tray_auto" },
      { value: "red", labelKey: "developer.flags.tray_red" },
      { value: "yellow", labelKey: "developer.flags.tray_yellow" },
    ],
    def: "auto",
  },
];

export function FeatureFlagsSection() {
  const { t } = useTranslation(I18nNamespace.SETTINGS);
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  const setFlag = (name: string, value: boolean | string) => {
    setFlags((f) => ({ ...f, [name]: value }));
  };

  return (
    <SettingsSection
      title={t("developer.sections.flags")}
      testId={TEST_IDS.settings.developer.sections.flags}
    >
      {KNOWN_FLAGS.map((f) => {
        const current = flags[f.name] ?? f.def;
        return (
          <SettingsRow key={f.name} label={t(f.labelKey)} sub={f.name}>
            {f.kind === "boolean" ? (
              <GeneralSwitchInput
                checked={current === true}
                onCheckedChange={(v) => setFlag(f.name, v)}
                data-testid={TEST_IDS.settings.developer.flag(f.name)}
              />
            ) : (
              <SelectNative
                value={String(current)}
                onChange={(e) => setFlag(f.name, e.target.value)}
                data-testid={TEST_IDS.settings.developer.flag(f.name)}
              >
                {f.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </SelectNative>
            )}
          </SettingsRow>
        );
      })}
      <SettingsRow label={t("developer.flags.add_custom")}>
        <ButtonRow>
          <TextInput
            type="text"
            placeholder={t("developer.flags.name")}
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            style={{ width: 140 }}
            data-testid={TEST_IDS.settings.developer.flagCustomName}
          />
          <TextInput
            type="text"
            placeholder={t("developer.flags.value")}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            style={{ width: 140 }}
            data-testid={TEST_IDS.settings.developer.flagCustomValue}
          />
          <GeneralButton
            size="sm"
            variant="outline"
            data-testid={TEST_IDS.settings.developer.flagAdd}
            onClick={() => {
              if (!customName.trim()) return;
              const raw = customValue.trim();
              const v = raw === "true" ? true : raw === "false" ? false : raw;
              setFlag(customName.trim(), v);
              setCustomName("");
              setCustomValue("");
            }}
          >
            {t("developer.flags.add")}
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label={t("developer.flags.reset_all")}>
        <GeneralButton
          size="sm"
          variant="ghost"
          data-testid={TEST_IDS.settings.developer.flagResetAll}
          onClick={() => {
            setFlags({});
            toast.success(t("developer.flags.reset_done"));
          }}
        >
          {t("developer.flags.reset_button")}
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default FeatureFlagsSection;

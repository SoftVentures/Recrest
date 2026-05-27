import { useState } from "react";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralSwitchInput from "@/components/atoms/inputs/GeneralSwitchInput";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  ButtonRow,
  SelectNative,
  TextInput,
} from "@/pages/app/Settings/components/DeveloperTab/sections/_shared";
import { SettingsRow, SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const KNOWN_FLAGS = [
  { name: "newRepoRow", label: "New repo row layout", kind: "boolean" as const, def: false },
  { name: "activityV2", label: "Activity v2", kind: "boolean" as const, def: false },
  {
    name: "trayBadgeColor",
    label: "Tray badge color",
    kind: "enum" as const,
    options: ["auto", "red", "yellow"],
    def: "auto",
  },
];

export function FeatureFlagsSection() {
  const [flags, setFlags] = useState<Record<string, boolean | string>>({});
  const [customName, setCustomName] = useState("");
  const [customValue, setCustomValue] = useState("");

  const setFlag = (name: string, value: boolean | string) => {
    setFlags((f) => ({ ...f, [name]: value }));
  };

  return (
    <SettingsSection title="Feature flags" testId={TEST_IDS.settings.developer.sections.flags}>
      {KNOWN_FLAGS.map((f) => {
        const current = flags[f.name] ?? f.def;
        return (
          <SettingsRow key={f.name} label={f.label} sub={f.name}>
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
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </SelectNative>
            )}
          </SettingsRow>
        );
      })}
      <SettingsRow label="Add custom flag">
        <ButtonRow>
          <TextInput
            type="text"
            placeholder="name"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            style={{ width: 140 }}
            data-testid={TEST_IDS.settings.developer.flagCustomName}
          />
          <TextInput
            type="text"
            placeholder="value"
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
            Add
          </GeneralButton>
        </ButtonRow>
      </SettingsRow>
      <SettingsRow label="Reset all flags">
        <GeneralButton
          size="sm"
          variant="ghost"
          data-testid={TEST_IDS.settings.developer.flagResetAll}
          onClick={() => {
            setFlags({});
            toast.success("Feature flags reset");
          }}
        >
          Reset
        </GeneralButton>
      </SettingsRow>
    </SettingsSection>
  );
}

export default FeatureFlagsSection;

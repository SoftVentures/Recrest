import { useTranslation } from "react-i18next";

import type { GitConfigEntry, GitConfigLayer } from "@recrest/shared";

import LayeredField from "@/components/molecules/gitConfig/LayeredField";
import { GIT_CONFIG_SECTIONS, type GitConfigSectionSpec } from "@/lib/constants/gitConfigSchema";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const EXCLUDED_SECTION_IDS = new Set<GitConfigSectionSpec["id"]>([
  "aliases",
  "url-rewrites",
  "custom",
]);

export interface SectionListProps {
  origins: Record<string, GitConfigEntry>;
  writableLayers: readonly GitConfigLayer[];
  onSaveField: (filePath: string, key: string, value: string) => Promise<void>;
}

export default function SectionList({ origins, writableLayers, onSaveField }: SectionListProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const sections = GIT_CONFIG_SECTIONS.filter((s) => !EXCLUDED_SECTION_IDS.has(s.id));

  return (
    <>
      {sections.map((section) => (
        <SettingsSection
          key={section.id}
          title={t(section.titleKey)}
          testId={TEST_IDS.gitConfigSettings.sectionCard(section.id)}
        >
          {section.fields.map((field) => (
            <LayeredField
              key={field.key}
              field={field}
              origin={origins[field.key]}
              writableLayers={writableLayers}
              onSave={(filePath, value) => onSaveField(filePath, field.key, value)}
            />
          ))}
        </SettingsSection>
      ))}
    </>
  );
}

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { openExternal } from "@/lib/tauri";
import ContributorRow from "@/pages/app/Settings/components/AboutTab/parts/ContributorsSection/parts/ContributorRow";
import { useContributors } from "@/pages/app/Settings/components/AboutTab/parts/ContributorsSection/useContributors";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { fontPxToRem, pxToRems } from "@/theme/scale";

const StateRow = styled(Box)(({ theme }) => ({
  padding: pxToRems(14, 16),
  fontSize: fontPxToRem(12.5),
  color: theme.palette.text.information,
})) as typeof Box;

function ContributorsSection() {
  const { t } = useTranslation();
  const { status, contributors } = useContributors();

  // Nothing to show and no error in flight — skip the section entirely rather
  // than render an empty "Contributors" card that reads as broken.
  if (status === "ready" && contributors.length === 0) {
    return null;
  }

  return (
    <SettingsSection
      title={t("settings.about.contributors_title")}
      subtitle={t("settings.about.contributors_sub")}
      testId={TEST_IDS.settings.about.contributors}
    >
      <GeneralCard padding={0} flushHeight>
        {status === "loading" && (
          <StateRow data-testid={TEST_IDS.settings.about.contributorsLoading}>
            {t("settings.about.contributors_loading")}
          </StateRow>
        )}
        {status === "error" && (
          <StateRow data-testid={TEST_IDS.settings.about.contributorsError}>
            {t("settings.about.contributors_error")}
          </StateRow>
        )}
        {status === "ready" &&
          contributors.map((c, i) => (
            <ContributorRow
              key={c.login}
              rank={i + 1}
              contributor={c}
              topContributions={contributors[0]?.contributions ?? c.contributions}
              onOpen={() => void openExternal(c.profileUrl)}
            />
          ))}
      </GeneralCard>
    </SettingsSection>
  );
}

export default ContributorsSection;

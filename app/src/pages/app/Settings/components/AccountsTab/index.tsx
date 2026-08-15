import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PROVIDER_IDS } from "@/lib/constants/providers.constants";
import { DefaultSshKey } from "@/pages/app/Settings/components/AccountsTab/parts/DefaultSshKey";
import { ProviderRow } from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

const Section = styled(Box)({
  marginBottom: pxToRem(22),
}) as typeof Box;

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  margin: pxToRems(0, 0, 6),
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Typography;

const SectionDesc = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  margin: pxToRems(0, 0, 10, 2),
})) as typeof Typography;

export function AccountsSection() {
  const { t } = useTranslation();
  return (
    <Section component="section">
      <SectionLabel component="h3">{t("settings.accounts.providers")}</SectionLabel>
      <SectionDesc component="p" variant="body2">
        {t("settings.accounts.providers_sub")}
      </SectionDesc>
      {PROVIDER_IDS.map((id) => (
        <ProviderRow key={id} providerId={id} />
      ))}

      <SectionLabel component="h3">{t("settings.accounts.ssh")}</SectionLabel>
      <SectionDesc component="p" variant="body2">
        {t("settings.accounts.ssh_sub")}
      </SectionDesc>
      <DefaultSshKey />
    </Section>
  );
}

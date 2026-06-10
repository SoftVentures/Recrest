import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PROVIDER_IDS } from "@/lib/constants/providers.constants";
import { DefaultSshKey } from "@/pages/app/Settings/components/AccountsTab/parts/DefaultSshKey";
import { ProviderRow } from "@/pages/app/Settings/components/AccountsTab/parts/ProviderRow";

const Section = styled(Box)({
  marginBottom: 22,
}) as typeof Box;

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  margin: "0 0 6px",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
})) as typeof Typography;

const SectionDesc = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  margin: "0 0 10px 2px",
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

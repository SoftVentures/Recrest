import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { PROVIDER_PAT_INFO, type ProviderKey } from "@recrest/shared";

import { BookOpen, ExternalLink } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { openExternal } from "@/lib/tauri";

export interface PatHelpPanelProps {
  provider: ProviderKey;
  /** Effective API base URL (for self-hosted GitLab) — passed to the
   *  per-provider `createUrl` builder. Empty string is fine for cloud. */
  baseUrl?: string;
}

const Root = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(1),
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.surface.interface.backElevation,
})) as typeof Box;

const Heading = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.text.information,
  margin: 0,
})) as typeof Typography;

const ScopeList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: theme.spacing(0.25),
  margin: 0,
  paddingLeft: theme.spacing(2),
})) as typeof Box;

const ScopeItem = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  lineHeight: 1.5,
  color: theme.palette.text.primary,
  margin: 0,
})) as typeof Typography;

const Actions = styled(Box)(({ theme }) => ({
  display: "flex",
  flexWrap: "wrap",
  gap: theme.spacing(1),
  alignItems: "center",
})) as typeof Box;

const ManualHint = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  lineHeight: 1.5,
  color: theme.palette.text.information,
  margin: 0,
})) as typeof Typography;

export function PatHelpPanel({ provider, baseUrl = "" }: PatHelpPanelProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const info = PROVIDER_PAT_INFO[provider];
  const scopes = info.requiredScopes;
  const createUrl = info.createUrl(baseUrl, scopes);

  return (
    <Root>
      <Heading component="h4">{t("pat.required_scopes")}</Heading>
      <ScopeList component="ul">
        {scopes.map((scope) => (
          <ScopeItem key={scope} component="li">
            {t(`pat.scope_label.${provider}.${scope}`, { defaultValue: scope })}
          </ScopeItem>
        ))}
      </ScopeList>
      <Actions>
        <GeneralButton
          variant="outline"
          size="sm"
          startIcon={<BookOpen size={13} />}
          onClick={() => void openExternal(info.docsUrl)}
          data-testid={TEST_IDS.onboarding.patHelpDocs}
        >
          {t("pat.read_docs")}
        </GeneralButton>
        <GeneralButton
          variant="default"
          size="sm"
          startIcon={<ExternalLink size={13} />}
          onClick={() => void openExternal(createUrl)}
          data-testid={TEST_IDS.onboarding.patHelpCreate}
        >
          {t("pat.create_token")}
        </GeneralButton>
      </Actions>
      {!info.supportsUrlScopes && (
        <ManualHint component="p">{t("pat.scopes_manual_hint")}</ManualHint>
      )}
    </Root>
  );
}

export default PatHelpPanel;

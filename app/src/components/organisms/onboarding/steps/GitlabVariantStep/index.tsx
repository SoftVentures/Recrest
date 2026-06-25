import { useState } from "react";

import { useTranslation } from "react-i18next";

import { FormControlLabel, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type ProviderPingResult, TauriCommand } from "@recrest/shared";

import { Cloud, Server } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import {
  StepBody,
  StepContent,
  StepFooter,
  StepHead,
  StepRoot,
  StepTitle,
} from "@/components/organisms/onboarding/steps/_shared";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { OnboardingStep } from "@/lib/constants/onboarding.constants";
import { PROVIDER_API_URLS, Provider } from "@/lib/constants/providers.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke } from "@/lib/tauri";
import { normalizeGitlabBaseUrl } from "@/lib/utils/gitlabBaseUrl.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";
import { useActionFeedback } from "@/lib/utils/useActionFeedback";

export type GitlabVariant = "cloud" | "self";

export interface GitlabVariantStepProps {
  onBack: () => void;
  /** Called when the variant resolves successfully. Receives the API base
   *  URL the user picked (cloud default or normalized self-hosted root). */
  onResolved: (apiBaseUrl: string) => void;
}

const VariantChoice = styled(RadioGroup)(({ theme }) => ({
  gap: theme.spacing(0.5),
}));

const ChoiceLabel = styled(Typography)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: theme.spacing(0.75),
  fontSize: 13,
  color: theme.palette.text.primary,
})) as typeof Typography;

const ChoiceSub = styled(Typography)(({ theme }) => ({
  fontSize: 11.5,
  color: theme.palette.text.information,
  marginLeft: theme.spacing(3.75),
})) as typeof Typography;

const DomainField = styled(TextField)({
  width: "100%",
});

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: toneText(theme, StatusTone.ERROR),
})) as typeof Typography;

const SuccessText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: toneText(theme, StatusTone.SUCCESS),
})) as typeof Typography;

const GITLAB_CLOUD_API = PROVIDER_API_URLS[Provider.GITLAB];

function GitlabVariantStep({ onBack, onResolved }: GitlabVariantStepProps) {
  const { t } = useTranslation(I18nNamespace.ONBOARDING);
  const [variant, setVariant] = useState<GitlabVariant>("cloud");
  const [domain, setDomain] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const feedback = useActionFeedback();

  const onNext = async () => {
    setError(null);
    setVersion(null);
    if (variant === "cloud") {
      onResolved(GITLAB_CLOUD_API);
      return;
    }
    const base = normalizeGitlabBaseUrl(domain);
    if (!base) {
      setError(t("gitlab.empty_domain"));
      return;
    }
    try {
      const result = await feedback.run(async () =>
        invoke<ProviderPingResult>(TauriCommand.PING_PROVIDER, {
          provider: Provider.GITLAB,
          baseUrl: base,
        }),
      );
      if (!result.reachable) {
        setError(t("gitlab.unreachable", { error: result.error ?? "" }));
        return;
      }
      if (!result.looksLikeProvider) {
        setError(t("gitlab.not_gitlab"));
        return;
      }
      setVersion(result.version);
      // Persist the *root* URL (e.g. `https://gitlab.acme.com`). The
      // provider registry will append `/api/v4` itself when resolving.
      onResolved(`${base}/api/v4`);
    } catch {
      // Hook already mirrored "error" into the button; surface a copy
      // string so the user knows *what* failed (vs. just the red icon).
      setError(t("gitlab.unreachable", { error: "" }));
    }
  };

  return (
    <StepRoot data-testid={TEST_IDS.onboarding.step(OnboardingStep.GITLAB_VARIANT)}>
      <StepHead>
        <StepTitle component="h1">{t("gitlab.variant_title")}</StepTitle>
        <StepBody component="p">{t("gitlab.variant_body")}</StepBody>
      </StepHead>
      <StepContent>
        <VariantChoice
          value={variant}
          onChange={(_, v) => {
            setVariant(v as GitlabVariant);
            setError(null);
            setVersion(null);
          }}
        >
          <FormControlLabel
            value="cloud"
            control={<Radio data-testid={TEST_IDS.onboarding.gitlabVariantCloud} />}
            label={
              <ChoiceLabel component="span">
                <Cloud size={14} /> {t("gitlab.cloud")}
              </ChoiceLabel>
            }
          />
          <ChoiceSub component="p">{t("gitlab.cloud_sub")}</ChoiceSub>
          <FormControlLabel
            value="self"
            control={<Radio data-testid={TEST_IDS.onboarding.gitlabVariantSelf} />}
            label={
              <ChoiceLabel component="span">
                <Server size={14} /> {t("gitlab.self_hosted")}
              </ChoiceLabel>
            }
          />
          <ChoiceSub component="p">{t("gitlab.self_hosted_sub")}</ChoiceSub>
        </VariantChoice>

        {variant === "self" && (
          <DomainField
            autoFocus
            size="small"
            type="url"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={t("gitlab.domain_placeholder")}
            label={t("gitlab.domain_label")}
            helperText={t("gitlab.domain_hint")}
            spellCheck={false}
            slotProps={{
              htmlInput: { "data-testid": TEST_IDS.onboarding.gitlabVariantDomain },
            }}
          />
        )}

        {error && <ErrorText component="p">{error}</ErrorText>}
        {version && <SuccessText component="p">{t("gitlab.detected", { version })}</SuccessText>}
      </StepContent>
      <StepFooter>
        <GeneralButton
          variant="ghost"
          onClick={onBack}
          data-testid={TEST_IDS.onboarding.gitlabVariantBack}
        >
          {t("gitlab.back")}
        </GeneralButton>
        <GeneralButton
          variant="default"
          onClick={() => void onNext()}
          feedbackState={feedback.state}
          loading={feedback.state === "loading"}
          disabled={feedback.state === "loading" || (variant === "self" && !domain.trim())}
          data-testid={TEST_IDS.onboarding.gitlabVariantNext}
        >
          {t("gitlab.next")}
        </GeneralButton>
      </StepFooter>
    </StepRoot>
  );
}

export default GitlabVariantStep;

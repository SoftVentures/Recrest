import { useCallback, useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { AppRoute, type GitConfigEntry, GitConfigKey, type GitConfigLayer } from "@recrest/shared";

import { FileText } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralCircularLoader, {
  CircularLoaderSize,
} from "@/components/atoms/loaders/GeneralCircularLoader";
import LayeredField from "@/components/molecules/gitConfig/LayeredField";
import {
  SourceBadge,
  SourceCondition,
} from "@/components/molecules/gitConfig/LayeredField/GitConfigStyles";
import type { GitConfigFieldSpec } from "@/lib/constants/gitConfigSchema";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { SETTINGS_TAB_QUERY_PARAM, SettingsTab } from "@/lib/constants/settings.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import {
  loadGitConfigLayers,
  loadGitConfigWithOrigins,
  setGitConfigInLayer,
} from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";

const Root = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 14,
}) as typeof Box;

const Section = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 8,
}) as typeof Box;

const SectionLabel = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  fontWeight: 600,
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
})) as typeof Typography;

const ChainList = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 4,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  padding: 8,
})) as typeof Box;

const ChainRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
  flexWrap: "wrap",
}) as typeof Box;

const Footer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
}) as typeof Box;

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.error.main,
})) as typeof Typography;

const EmptyText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;

const LoadingRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(idx + 1);
}

const IDENTITY_FIELDS: readonly GitConfigFieldSpec[] = [
  { key: GitConfigKey.USER_NAME, labelKey: "settings.git.label_user_name", kind: "text" },
  { key: GitConfigKey.USER_EMAIL, labelKey: "settings.git.label_user_email", kind: "email" },
];

export interface RepoGitConfigCardProps {
  repoId: string;
}

export default function RepoGitConfigCard({ repoId }: RepoGitConfigCardProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [layers, setLayers] = useState<GitConfigLayer[]>([]);
  const [origins, setOrigins] = useState<Record<string, GitConfigEntry>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauri()) return;
    setLoading(true);
    setError(null);
    try {
      const [nextLayers, nextOrigins] = await Promise.all([
        dispatch(loadGitConfigLayers({ repoId })).unwrap(),
        dispatch(loadGitConfigWithOrigins({ repoId })).unwrap(),
      ]);
      setLayers(nextLayers ?? []);
      setOrigins(nextOrigins ?? {});
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      setError(message);
      toast.error(`${t("settings.git.load_error")}: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [dispatch, repoId, t]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const writableLayers = useMemo(() => layers.filter((l) => l.active && l.exists), [layers]);

  const saveField = useCallback(
    async (filePath: string, key: string, value: string) => {
      try {
        const updated = await dispatch(
          setGitConfigInLayer({ repoId, filePath, key, value }),
        ).unwrap();
        setOrigins(updated);
        await refresh();
        toast.success(t("settings.git.save_success"));
      } catch (err) {
        toast.error(`${t("settings.git.save_error")}: ${String((err as Error)?.message ?? err)}`);
        throw err;
      }
    },
    [dispatch, refresh, repoId, t],
  );

  const goToSettings = useCallback(() => {
    navigate(`${AppRoute.SETTINGS}?${SETTINGS_TAB_QUERY_PARAM}=${SettingsTab.GIT}`);
  }, [navigate]);

  return (
    <Root data-testid={TEST_IDS.repoDetail.gitConfig.root}>
      {loading && layers.length === 0 && (
        <LoadingRow data-testid={TEST_IDS.repoDetail.gitConfig.loading}>
          <GeneralCircularLoader size={CircularLoaderSize.SM} />
        </LoadingRow>
      )}

      {error && !loading && (
        <ErrorText data-testid={TEST_IDS.repoDetail.gitConfig.error}>{error}</ErrorText>
      )}

      <Section data-testid={TEST_IDS.repoDetail.gitConfig.identitySection}>
        {IDENTITY_FIELDS.map((field) => (
          <LayeredField
            key={field.key}
            field={field}
            origin={origins[field.key]}
            writableLayers={writableLayers}
            onSave={(filePath, value) => saveField(filePath, field.key, value)}
          />
        ))}
      </Section>

      <Section>
        <SectionLabel>{t("settings.git.repo_card_chain_label")}</SectionLabel>
        {writableLayers.length === 0 ? (
          <EmptyText>{t("settings.git.repo_card_empty")}</EmptyText>
        ) : (
          <ChainList data-testid={TEST_IDS.repoDetail.gitConfig.chainList}>
            {writableLayers.map((layer) => (
              <ChainRow
                key={layer.path}
                data-testid={TEST_IDS.repoDetail.gitConfig.chainRow(basename(layer.path))}
              >
                <SourceBadge>
                  <FileText size={11} aria-hidden />
                  {basename(layer.path)}
                </SourceBadge>
                {layer.condition && <SourceCondition>{layer.condition}</SourceCondition>}
              </ChainRow>
            ))}
          </ChainList>
        )}
      </Section>

      <Footer>
        <GeneralButton
          size="sm"
          variant="link"
          onClick={goToSettings}
          data-testid={TEST_IDS.repoDetail.gitConfig.fullSettingsLink}
        >
          {t("settings.git.repo_card_open_settings")}
        </GeneralButton>
      </Footer>
    </Root>
  );
}

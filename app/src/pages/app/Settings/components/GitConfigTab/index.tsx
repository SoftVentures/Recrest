import { useEffect, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { GitConfigKey, type GitConfigSnapshot, TauriCommand } from "@recrest/shared";

import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";

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
  margin: "0 0 12px 2px",
})) as typeof Typography;

const Form = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 10,
}) as typeof Box;

const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  marginTop: 8,
}) as typeof Box;

const KEYS: readonly GitConfigKey[] = [
  GitConfigKey.USER_NAME,
  GitConfigKey.USER_EMAIL,
  GitConfigKey.CORE_EDITOR,
  GitConfigKey.CORE_AUTOCRLF,
  GitConfigKey.INIT_DEFAULT_BRANCH,
  GitConfigKey.PULL_REBASE,
  GitConfigKey.COMMIT_GPGSIGN,
];

const LABEL_KEYS: Record<GitConfigKey, string> = {
  [GitConfigKey.USER_NAME]: "settings.git.label_user_name",
  [GitConfigKey.USER_EMAIL]: "settings.git.label_user_email",
  [GitConfigKey.CORE_EDITOR]: "settings.git.label_core_editor",
  [GitConfigKey.CORE_AUTOCRLF]: "settings.git.label_core_autocrlf",
  [GitConfigKey.INIT_DEFAULT_BRANCH]: "settings.git.label_init_default_branch",
  [GitConfigKey.PULL_REBASE]: "settings.git.label_pull_rebase",
  [GitConfigKey.COMMIT_GPGSIGN]: "settings.git.label_commit_gpgsign",
};

type Values = Partial<Record<GitConfigKey, string>>;

/**
 * Global git config editor. Reads the whitelisted keys from `~/.gitconfig`
 * on mount and writes back any field the user edited on Save. Empty
 * strings get translated by the backend into key removals, so clearing a
 * field "undoes" a previously-set value rather than persisting an empty
 * one.
 */
export function GitConfigSection() {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const [values, setValues] = useState<Values>({});
  const [original, setOriginal] = useState<Values>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    setLoading(true);
    void invoke<GitConfigSnapshot>(TauriCommand.GET_GIT_CONFIG, { repoId: null })
      .then((snap) => {
        if (cancelled) return;
        setValues(snap.entries);
        setOriginal(snap.entries);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(`${t("settings.git.load_error")}: ${String((err as Error)?.message ?? err)}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const dirty = KEYS.some((k) => (values[k] ?? "") !== (original[k] ?? ""));

  const onSave = async () => {
    if (!dirty || !isTauri()) return;
    setSaving(true);
    try {
      let latest: GitConfigSnapshot | null = null;
      for (const k of KEYS) {
        const next = values[k] ?? "";
        const before = original[k] ?? "";
        if (next === before) continue;
        latest = await invoke<GitConfigSnapshot>(TauriCommand.SET_GIT_CONFIG, {
          repoId: null,
          key: k,
          value: next,
        });
      }
      if (latest) {
        setValues(latest.entries);
        setOriginal(latest.entries);
      }
      toast.success(t("settings.git.save_success"));
    } catch (err) {
      toast.error(`${t("settings.git.save_error")}: ${String((err as Error)?.message ?? err)}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section data-testid={TEST_IDS.gitConfigSettings.root}>
      <SectionLabel>{t("settings.git.section")}</SectionLabel>
      <SectionDesc>{t("settings.git.section_sub")}</SectionDesc>
      <Form>
        {KEYS.map((k) => (
          <TextField
            key={k}
            label={t(LABEL_KEYS[k])}
            size="small"
            value={values[k] ?? ""}
            onChange={(e) => setValues((prev) => ({ ...prev, [k]: e.target.value }))}
            slotProps={{
              htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.field(k) },
            }}
            disabled={loading}
          />
        ))}
      </Form>
      <Actions>
        <GeneralButton
          onClick={() => void onSave()}
          loading={saving}
          disabled={!dirty || loading}
          data-testid={TEST_IDS.gitConfigSettings.save}
        >
          {t("settings.git.save")}
        </GeneralButton>
      </Actions>
    </Section>
  );
}

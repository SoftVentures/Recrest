import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Checkbox, FormControlLabel, Radio, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { FolderOpen } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { pickFolder } from "@/lib/utils/pickFolder.utils";

const Body = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "8px 0",
}) as typeof Box;

const Field = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 6,
}) as typeof Box;

const FieldLabel = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 500,
  color: theme.palette.text.primary,
})) as typeof Typography;

const PatternRow = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: 4,
}) as typeof Box;

const PatternOption = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

const PatternHint = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontStyle: "italic",
})) as typeof Typography;

const DirectoryRow = styled(Box)({
  display: "flex",
  alignItems: "stretch",
  gap: 8,
}) as typeof Box;

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.error.main,
})) as typeof Typography;

export interface AddGitConfigIncludeModalProps {
  open: boolean;
  /** Path to the root (unconditional) config file the new include is written into. */
  configFile: string;
  /** Resolved home directory — used to compose the default target path. The
   *  modal also accepts paths with `~` prefix; the backend expands them. */
  homeDir: string | null;
  onCancel: () => void;
  onSubmit: (args: {
    configFile: string;
    condition: string;
    targetPath: string;
    createTargetSkeleton: boolean;
  }) => Promise<void>;
}

function lastSegment(path: string): string {
  const trimmed = path.replace(/[/\\]+$/, "");
  const idx = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return idx === -1 ? trimmed : trimmed.slice(idx + 1);
}

function defaultTargetForDirectory(directory: string, homeDir: string | null): string {
  const slug = lastSegment(directory)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-");
  const safeSlug = slug || "work";
  const base = homeDir && homeDir.length > 0 ? homeDir.replace(/[/\\]+$/, "") : "~";
  return `${base}/.gitconfig-${safeSlug}`;
}

export default function AddGitConfigIncludeModal({
  open,
  configFile,
  homeDir,
  onCancel,
  onSubmit,
}: AddGitConfigIncludeModalProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);

  const [directory, setDirectory] = useState("");
  const [target, setTarget] = useState("");
  const [targetTouched, setTargetTouched] = useState(false);
  const [createSkeleton, setCreateSkeleton] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setDirectory("");
    setTarget("");
    setTargetTouched(false);
    setCreateSkeleton(true);
    setBusy(false);
    setError(null);
  }, [open]);

  const computedTarget = useMemo(() => {
    if (targetTouched) return target;
    if (!directory.trim()) return "";
    return defaultTargetForDirectory(directory.trim(), homeDir);
  }, [directory, target, targetTouched, homeDir]);

  const onBrowse = async () => {
    const picked = await pickFolder(directory.trim() || homeDir || undefined);
    if (picked) {
      setDirectory(picked);
      if (!targetTouched) {
        setTarget(defaultTargetForDirectory(picked, homeDir));
      }
    }
  };

  const submitDisabled = busy || !directory.trim() || !computedTarget.trim() || !configFile;

  const submit = async () => {
    const dir = directory.trim().replace(/[/\\]+$/, "");
    const tgt = computedTarget.trim();
    if (!dir || !tgt) return;
    const condition = `gitdir:${dir}/`;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        configFile,
        condition,
        targetPath: tgt,
        createTargetSkeleton: createSkeleton,
      });
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <GeneralModal
      open={open}
      modalWidth={560}
      customTitle={t("settings.git.add_identity_modal_title")}
      textCapitalize={false}
      onCloseModal={() => !busy && onCancel()}
      data-testid={TEST_IDS.gitConfigSettings.addIncludeModal.root}
      contentChildren={
        <Body>
          <Field>
            <FieldLabel>{t("settings.git.add_identity_pattern_label")}</FieldLabel>
            <PatternRow>
              <PatternOption>
                <Radio
                  size="small"
                  color="primary"
                  checked
                  readOnly
                  slotProps={{
                    input: {
                      "data-testid": TEST_IDS.gitConfigSettings.addIncludeModal.patternGitdir,
                    } as React.InputHTMLAttributes<HTMLInputElement>,
                  }}
                />
                <Typography component="span" variant="body2">
                  {t("settings.git.add_identity_pattern_gitdir")}
                </Typography>
              </PatternOption>
              <PatternOption>
                <Radio size="small" disabled />
                <PatternHint>{t("settings.git.add_identity_pattern_other_disabled")}</PatternHint>
              </PatternOption>
            </PatternRow>
          </Field>

          <Field>
            <FieldLabel>{t("settings.git.add_identity_directory_label")}</FieldLabel>
            <DirectoryRow>
              <TextField
                fullWidth
                size="small"
                value={directory}
                placeholder={t("settings.git.add_identity_directory_placeholder")}
                onChange={(e) => setDirectory(e.target.value)}
                slotProps={{
                  htmlInput: {
                    "data-testid": TEST_IDS.gitConfigSettings.addIncludeModal.directoryInput,
                  },
                }}
              />
              <GeneralButton
                size="sm"
                variant="outline"
                onClick={() => void onBrowse()}
                disabled={!isTauri()}
                startIcon={<FolderOpen size={13} />}
                data-testid={TEST_IDS.gitConfigSettings.addIncludeModal.directoryPicker}
              >
                {t("settings.git.add_identity_directory_browse")}
              </GeneralButton>
            </DirectoryRow>
          </Field>

          <Field>
            <FieldLabel>{t("settings.git.add_identity_target_label")}</FieldLabel>
            <TextField
              fullWidth
              size="small"
              value={computedTarget}
              placeholder={t("settings.git.add_identity_target_placeholder")}
              onChange={(e) => {
                setTargetTouched(true);
                setTarget(e.target.value);
              }}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.addIncludeModal.targetInput,
                },
              }}
            />
          </Field>

          <FormControlLabel
            control={
              <Checkbox
                size="small"
                color="primary"
                checked={createSkeleton}
                onChange={(e) => setCreateSkeleton(e.target.checked)}
                slotProps={{
                  input: {
                    "data-testid": TEST_IDS.gitConfigSettings.addIncludeModal.skeletonToggle,
                  } as React.InputHTMLAttributes<HTMLInputElement>,
                }}
              />
            }
            label={
              <Typography component="span" variant="body2">
                {t("settings.git.add_identity_skeleton_label")}
              </Typography>
            }
          />

          {error && <ErrorText>{error}</ErrorText>}
        </Body>
      }
      actionsChildren={
        <>
          <GeneralButton
            variant="ghost"
            onClick={onCancel}
            disabled={busy}
            data-testid={TEST_IDS.gitConfigSettings.addIncludeModal.cancel}
          >
            {t("settings.git.cancel")}
          </GeneralButton>
          <GeneralButton
            variant="default"
            onClick={() => void submit()}
            loading={busy}
            disabled={submitDisabled}
            data-testid={TEST_IDS.gitConfigSettings.addIncludeModal.submit}
          >
            {t("settings.git.add_identity_submit")}
          </GeneralButton>
        </>
      }
    />
  );
}

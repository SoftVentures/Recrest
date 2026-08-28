import { useEffect, useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { MenuItem, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { GitConfigEntry, GitConfigLayer } from "@recrest/shared";

import { FileText, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, {
  ICON_BUTTON_ICON_SIZES,
  IconButtonSize,
  IconButtonTone,
} from "@/components/atoms/buttons/GeneralIconButton";
import {
  LayerChip,
  LayerChipText,
} from "@/components/molecules/gitConfig/LayeredField/GitConfigStyles";
import ConfirmationModal from "@/components/molecules/modals/ConfirmationModal";
import { ALIAS_PREFIX } from "@/lib/constants/gitConfigSchema";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import {
  AddFormActions,
  CustomCellKey,
  CustomCellValue,
  CustomEmpty,
  CustomRow,
  CustomRowActions,
  CustomTable,
  GIT_CONFIG_ROW_STACK,
  InlineAddForm,
  InlineErrorText,
} from "@/pages/app/Settings/components/GitConfigTab/GitConfigTab.styles";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setGitConfigInLayer } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { fontPxToRem, pxToRem } from "@/theme/scale";

const AliasRow = styled(CustomRow)({
  gridTemplateColumns: `minmax(${pxToRem(110)}, 0.8fr) minmax(${pxToRem(200)}, 2.4fr) auto auto`,
  ...GIT_CONFIG_ROW_STACK,
}) as typeof CustomRow;

const StaticLayerLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  textAlign: "center",
  flex: "0 0 auto",
})) as typeof Typography;

const RowMetaCell = styled(CustomCellValue)({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-end",
}) as typeof CustomCellValue;

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(idx + 1);
}

interface AliasEntry {
  name: string;
  command: string;
  sourcePath: string;
}

export interface AliasesEditorProps {
  origins: Record<string, GitConfigEntry>;
  writableLayers: readonly GitConfigLayer[];
  onAfterWrite: () => Promise<void>;
}

interface AliasRowProps {
  entry: AliasEntry;
  onCommit: (entry: AliasEntry, command: string) => Promise<void>;
  onRequestRemove: (entry: AliasEntry) => void;
  editLabel: string;
  removeLabel: string;
}

function AliasRowItem({ entry, onCommit, onRequestRemove, editLabel, removeLabel }: AliasRowProps) {
  const [value, setValue] = useState(entry.command);
  const [committed, setCommitted] = useState(entry.command);

  useEffect(() => {
    setValue(entry.command);
    setCommitted(entry.command);
  }, [entry.command]);

  const handleBlur = async () => {
    if (value === committed) return;
    try {
      await onCommit(entry, value);
      setCommitted(value);
    } catch {
      // toast handled upstream
    }
  };

  return (
    <AliasRow data-testid={TEST_IDS.gitConfigSettings.aliasesEditor.row(entry.name)}>
      <CustomCellKey>{entry.name}</CustomCellKey>
      <TextField
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void handleBlur()}
        aria-label={editLabel}
      />
      <RowMetaCell component="div">
        <LayerChip title={entry.sourcePath}>
          <FileText size={pxToRem(12)} aria-hidden />
          <LayerChipText>{basename(entry.sourcePath)}</LayerChipText>
        </LayerChip>
      </RowMetaCell>
      <CustomRowActions>
        <GeneralIconButton
          icon={<Trash2 size={ICON_BUTTON_ICON_SIZES[IconButtonSize.SM]} />}
          size={IconButtonSize.SM}
          tone={IconButtonTone.DANGER}
          aria-label={removeLabel}
          onClick={() => onRequestRemove(entry)}
          data-testid={TEST_IDS.gitConfigSettings.aliasesEditor.remove(entry.name)}
        />
      </CustomRowActions>
    </AliasRow>
  );
}

export default function AliasesEditor({
  origins,
  writableLayers,
  onAfterWrite,
}: AliasesEditorProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const dispatch = useAppDispatch();

  const aliases = useMemo<AliasEntry[]>(() => {
    return Object.entries(origins)
      .filter(([k]) => /^alias\.[^.]+$/.test(k))
      .map(([k, entry]) => ({
        name: k.slice(ALIAS_PREFIX.length),
        command: entry.value,
        sourcePath: entry.sourcePath,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [origins]);

  const defaultLayer = writableLayers[0]?.path ?? "";

  const [draft, setDraft] = useState({
    name: "",
    command: "",
    filePath: defaultLayer,
  });

  useEffect(() => {
    setDraft((prev) => (prev.filePath ? prev : { ...prev, filePath: defaultLayer }));
  }, [defaultLayer]);
  const [removeTarget, setRemoveTarget] = useState<AliasEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitInlineEdit = async (entry: AliasEntry, command: string) => {
    try {
      await dispatch(
        setGitConfigInLayer({
          repoId: null,
          filePath: entry.sourcePath,
          key: `${ALIAS_PREFIX}${entry.name}`,
          value: command,
        }),
      ).unwrap();
      await onAfterWrite();
      toast.success(t("settings.git.save_success"));
    } catch (err) {
      const message = String((err as Error)?.message ?? err);
      toast.error(`${t("settings.git.save_error")}: ${message}`);
      throw err;
    }
  };

  const submitAdd = async () => {
    const trimmedName = draft.name.trim();
    if (!trimmedName || !draft.command.trim() || !draft.filePath) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        setGitConfigInLayer({
          repoId: null,
          filePath: draft.filePath,
          key: `${ALIAS_PREFIX}${trimmedName}`,
          value: draft.command,
        }),
      ).unwrap();
      setDraft({ name: "", command: "", filePath: defaultLayer });
      await onAfterWrite();
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        setGitConfigInLayer({
          repoId: null,
          filePath: removeTarget.sourcePath,
          key: `${ALIAS_PREFIX}${removeTarget.name}`,
          value: "",
        }),
      ).unwrap();
      setRemoveTarget(null);
      await onAfterWrite();
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  const singleLayer = writableLayers.length === 1 ? writableLayers[0] : null;

  return (
    <SettingsSection
      title={t("settings.git.aliases_title")}
      testId={TEST_IDS.gitConfigSettings.aliasesEditor.root}
    >
      <CustomTable>
        {aliases.length === 0 && <CustomEmpty>{t("settings.git.aliases_empty")}</CustomEmpty>}
        {aliases.map((entry) => (
          <AliasRowItem
            key={entry.name}
            entry={entry}
            onCommit={commitInlineEdit}
            onRequestRemove={setRemoveTarget}
            editLabel={t("settings.git.alias_command_label")}
            removeLabel={t("settings.git.remove")}
          />
        ))}

        {writableLayers.length > 0 && (
          <InlineAddForm>
            <TextField
              size="small"
              placeholder={t("settings.git.alias_name_label")}
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.aliasesEditor.addNameInput,
                },
              }}
            />
            <TextField
              size="small"
              placeholder={t("settings.git.alias_command_label")}
              value={draft.command}
              onChange={(e) => setDraft((p) => ({ ...p, command: e.target.value }))}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.aliasesEditor.addCommandInput,
                },
              }}
            />
            {singleLayer ? (
              <StaticLayerLabel>{basename(singleLayer.path)}</StaticLayerLabel>
            ) : (
              <TextField
                select
                size="small"
                value={draft.filePath}
                onChange={(e) => setDraft((p) => ({ ...p, filePath: e.target.value }))}
                slotProps={{
                  htmlInput: {
                    "data-testid": TEST_IDS.gitConfigSettings.aliasesEditor.addLayerSelect,
                  },
                }}
              >
                {writableLayers.map((layer) => (
                  <MenuItem key={layer.path} value={layer.path}>
                    {basename(layer.path)}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <AddFormActions>
              <GeneralButton
                variant="default"
                startIcon={<Plus size={pxToRem(14)} />}
                onClick={() => void submitAdd()}
                loading={submitting}
                disabled={!draft.name.trim() || !draft.command.trim() || !draft.filePath}
                data-testid={TEST_IDS.gitConfigSettings.aliasesEditor.addSubmit}
              >
                {t("settings.git.add_alias_submit")}
              </GeneralButton>
            </AddFormActions>
            {error && <InlineErrorText>{error}</InlineErrorText>}
          </InlineAddForm>
        )}
      </CustomTable>

      <ConfirmationModal
        open={removeTarget !== null}
        title={t("settings.git.remove_alias_title")}
        description={t("settings.git.remove_alias_body")}
        confirmLabel={t("settings.git.remove")}
        cancelLabel={t("settings.git.cancel")}
        destructive
        onCancel={() => (submitting ? undefined : setRemoveTarget(null))}
        onConfirm={() => void confirmRemove()}
      />
    </SettingsSection>
  );
}

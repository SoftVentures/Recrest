import { useMemo, useState } from "react";

import { useTranslation } from "react-i18next";

import { MenuItem, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { GitConfigEntry, GitConfigLayer } from "@recrest/shared";

import { FileText, Plus, Trash2 } from "lucide-react";

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
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import {
  AddFormActions,
  CustomCellKey,
  CustomEmpty,
  CustomFooter,
  CustomRow,
  CustomRowActions,
  CustomTable,
  GIT_CONFIG_ROW_STACK,
  InlineAddForm,
  InlineErrorText,
} from "@/pages/app/Settings/components/GitConfigTab/GitConfigTab.styles";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";

const CustomRowFour = styled(CustomRow)({
  gridTemplateColumns: "minmax(140px, 1fr) minmax(220px, 2.2fr) auto auto",
  ...GIT_CONFIG_ROW_STACK,
}) as typeof CustomRow;

const ErrorText = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  color: theme.palette.error.main,
  paddingTop: 4,
})) as typeof Typography;

export interface CustomKeysListProps {
  entries: ReadonlyArray<[string, GitConfigEntry]>;
  writableLayers: readonly GitConfigLayer[];
  onSave: (filePath: string, key: string, value: string) => Promise<void>;
}

function basename(path: string): string {
  const idx = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return idx === -1 ? path : path.slice(idx + 1);
}

interface RowProps {
  rowKey: string;
  entry: GitConfigEntry;
  onSave: CustomKeysListProps["onSave"];
  onRemove: (rowKey: string, entry: GitConfigEntry) => Promise<void>;
  removeLabel: string;
}

function CustomRowItem({ rowKey, entry, onSave, onRemove, removeLabel }: RowProps) {
  const [value, setValue] = useState(entry.value);
  const [committed, setCommitted] = useState(entry.value);

  const commit = async (next: string) => {
    if (next === committed) return;
    try {
      await onSave(entry.sourcePath, rowKey, next);
      setCommitted(next);
    } catch {
      // toast handled upstream
    }
  };

  return (
    <CustomRowFour data-testid={TEST_IDS.gitConfigSettings.customKeyRow(rowKey)}>
      <CustomCellKey>{rowKey}</CustomCellKey>
      <TextField
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={(e) => void commit(e.target.value)}
        slotProps={{
          htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.field(rowKey) },
        }}
      />
      <LayerChip title={entry.sourcePath}>
        <FileText size={12} aria-hidden />
        <LayerChipText>{basename(entry.sourcePath)}</LayerChipText>
      </LayerChip>
      <CustomRowActions>
        <GeneralIconButton
          icon={<Trash2 size={ICON_BUTTON_ICON_SIZES[IconButtonSize.SM]} />}
          size={IconButtonSize.SM}
          tone={IconButtonTone.DANGER}
          aria-label={removeLabel}
          onClick={() => void onRemove(rowKey, entry)}
          data-testid={TEST_IDS.gitConfigSettings.customKeyRowRemove(rowKey)}
        />
      </CustomRowActions>
    </CustomRowFour>
  );
}

export default function CustomKeysList({ entries, writableLayers, onSave }: CustomKeysListProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({
    key: "",
    value: "",
    filePath: writableLayers[0]?.path ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaultLayer = useMemo(() => writableLayers[0]?.path ?? "", [writableLayers]);

  const openAdd = () => {
    setDraft({ key: "", value: "", filePath: defaultLayer });
    setError(null);
    setAdding(true);
  };

  const cancelAdd = () => {
    setAdding(false);
    setError(null);
  };

  const submitAdd = async () => {
    if (!draft.key.trim() || !draft.filePath) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(draft.filePath, draft.key.trim(), draft.value);
      setAdding(false);
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (key: string, entry: GitConfigEntry) => {
    setError(null);
    try {
      await onSave(entry.sourcePath, key, "");
    } catch (err) {
      setError(String((err as Error)?.message ?? err));
    }
  };

  return (
    <SettingsSection
      title={t("settings.git.custom_keys_title")}
      testId={TEST_IDS.gitConfigSettings.customKeysList}
    >
      <CustomTable>
        {entries.length === 0 && !adding && (
          <CustomEmpty>{t("settings.git.custom_keys_empty")}</CustomEmpty>
        )}
        {entries.map(([key, entry]) => (
          <CustomRowItem
            key={key}
            rowKey={key}
            entry={entry}
            onSave={onSave}
            onRemove={remove}
            removeLabel={t("settings.git.remove")}
          />
        ))}
        {adding && (
          <InlineAddForm>
            <TextField
              size="small"
              placeholder={t("settings.git.custom_key_placeholder")}
              value={draft.key}
              onChange={(e) => setDraft((p) => ({ ...p, key: e.target.value }))}
              slotProps={{
                htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.customKeyAddKeyInput },
              }}
            />
            <TextField
              size="small"
              placeholder={t("settings.git.custom_value_placeholder")}
              value={draft.value}
              onChange={(e) => setDraft((p) => ({ ...p, value: e.target.value }))}
              slotProps={{
                htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.customKeyAddValueInput },
              }}
            />
            <TextField
              select
              size="small"
              value={draft.filePath}
              onChange={(e) => setDraft((p) => ({ ...p, filePath: e.target.value }))}
              slotProps={{
                htmlInput: { "data-testid": TEST_IDS.gitConfigSettings.customKeyAddLayerInput },
              }}
            >
              {writableLayers.map((layer) => (
                <MenuItem key={layer.path} value={layer.path}>
                  {basename(layer.path)}
                </MenuItem>
              ))}
            </TextField>
            <AddFormActions>
              <GeneralButton
                variant="ghost"
                onClick={cancelAdd}
                disabled={submitting}
                data-testid={TEST_IDS.gitConfigSettings.customKeyAddCancel}
              >
                {t("settings.git.cancel")}
              </GeneralButton>
              <GeneralButton
                variant="default"
                startIcon={<Plus size={14} />}
                onClick={() => void submitAdd()}
                loading={submitting}
                disabled={!draft.key.trim() || !draft.filePath}
                data-testid={TEST_IDS.gitConfigSettings.customKeyAddSubmit}
              >
                {t("settings.git.add_custom_key")}
              </GeneralButton>
            </AddFormActions>
            {error && <InlineErrorText>{error}</InlineErrorText>}
          </InlineAddForm>
        )}
      </CustomTable>

      {!adding && writableLayers.length > 0 && (
        <CustomFooter>
          <GeneralButton
            size="sm"
            variant="outline"
            onClick={openAdd}
            startIcon={<Plus size={14} />}
            data-testid={TEST_IDS.gitConfigSettings.customKeyAdd}
          >
            {t("settings.git.add_custom_key")}
          </GeneralButton>
        </CustomFooter>
      )}

      {error && !adding && <ErrorText>{error}</ErrorText>}
    </SettingsSection>
  );
}

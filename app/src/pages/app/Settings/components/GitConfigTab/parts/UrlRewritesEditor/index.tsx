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
import { URL_PREFIX } from "@/lib/constants/gitConfigSchema";
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
  InlineAddForm,
  InlineErrorText,
} from "@/pages/app/Settings/components/GitConfigTab/GitConfigTab.styles";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import { setGitConfigInLayer } from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { fontPxToRem, pxToRem, pxToRems } from "@/theme/scale";

type Direction = "insteadOf" | "pushInsteadOf";

const UrlRow = styled(CustomRow)({
  gridTemplateColumns: `minmax(${pxToRem(170)}, 1.2fr) minmax(${pxToRem(180)}, 1.6fr) minmax(${pxToRem(110)}, auto) auto auto`,
}) as typeof CustomRow;

const StaticLayerLabel = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  textAlign: "center",
  flex: "0 0 auto",
})) as typeof Typography;

const DirectionChip = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: pxToRems(0, 12),
  minHeight: pxToRem(38),
  minWidth: pxToRem(120),
  borderRadius: 8,
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
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

function parseUrlKey(key: string): { base: string; direction: Direction } | null {
  if (!key.startsWith(URL_PREFIX)) return null;
  const inner = key.slice(URL_PREFIX.length);
  if (inner.endsWith(".pushInsteadOf")) {
    return {
      base: inner.slice(0, -".pushInsteadOf".length),
      direction: "pushInsteadOf",
    };
  }
  if (inner.endsWith(".insteadOf")) {
    return {
      base: inner.slice(0, -".insteadOf".length),
      direction: "insteadOf",
    };
  }
  return null;
}

function buildUrlKey(base: string, direction: Direction): string {
  return `${URL_PREFIX}${base}.${direction}`;
}

interface UrlEntry {
  key: string;
  base: string;
  from: string;
  direction: Direction;
  sourcePath: string;
}

export interface UrlRewritesEditorProps {
  origins: Record<string, GitConfigEntry>;
  writableLayers: readonly GitConfigLayer[];
  onAfterWrite: () => Promise<void>;
}

interface UrlRowProps {
  entry: UrlEntry;
  onCommit: (entry: UrlEntry, from: string) => Promise<void>;
  onRequestRemove: (entry: UrlEntry) => void;
  fromLabel: string;
  insteadOfLabel: string;
  pushInsteadOfLabel: string;
  removeLabel: string;
}

function UrlRowItem({
  entry,
  onCommit,
  onRequestRemove,
  fromLabel,
  insteadOfLabel,
  pushInsteadOfLabel,
  removeLabel,
}: UrlRowProps) {
  const [value, setValue] = useState(entry.from);
  const [committed, setCommitted] = useState(entry.from);

  useEffect(() => {
    setValue(entry.from);
    setCommitted(entry.from);
  }, [entry.from]);

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
    <UrlRow data-testid={TEST_IDS.gitConfigSettings.urlRewritesEditor.row(entry.key)}>
      <CustomCellKey>{entry.base}</CustomCellKey>
      <TextField
        size="small"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => void handleBlur()}
        aria-label={fromLabel}
      />
      <DirectionChip>
        {entry.direction === "pushInsteadOf" ? pushInsteadOfLabel : insteadOfLabel}
      </DirectionChip>
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
          data-testid={TEST_IDS.gitConfigSettings.urlRewritesEditor.remove(entry.key)}
        />
      </CustomRowActions>
    </UrlRow>
  );
}

export default function UrlRewritesEditor({
  origins,
  writableLayers,
  onAfterWrite,
}: UrlRewritesEditorProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const dispatch = useAppDispatch();

  const rewrites = useMemo<UrlEntry[]>(() => {
    const out: UrlEntry[] = [];
    for (const [key, entry] of Object.entries(origins)) {
      const parsed = parseUrlKey(key);
      if (!parsed) continue;
      out.push({
        key,
        base: parsed.base,
        from: entry.value,
        direction: parsed.direction,
        sourcePath: entry.sourcePath,
      });
    }
    return out.sort((a, b) => a.key.localeCompare(b.key));
  }, [origins]);

  const defaultLayer = writableLayers[0]?.path ?? "";

  const [draft, setDraft] = useState<{
    from: string;
    to: string;
    direction: Direction;
    filePath: string;
  }>({ from: "", to: "", direction: "insteadOf", filePath: defaultLayer });

  useEffect(() => {
    setDraft((prev) => (prev.filePath ? prev : { ...prev, filePath: defaultLayer }));
  }, [defaultLayer]);
  const [removeTarget, setRemoveTarget] = useState<UrlEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const commitInlineEdit = async (entry: UrlEntry, from: string) => {
    try {
      await dispatch(
        setGitConfigInLayer({
          repoId: null,
          filePath: entry.sourcePath,
          key: entry.key,
          value: from,
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
    const from = draft.from.trim();
    const to = draft.to.trim();
    if (!from || !to || !draft.filePath) return;
    setSubmitting(true);
    setError(null);
    try {
      await dispatch(
        setGitConfigInLayer({
          repoId: null,
          filePath: draft.filePath,
          key: buildUrlKey(to, draft.direction),
          value: from,
        }),
      ).unwrap();
      setDraft({ from: "", to: "", direction: "insteadOf", filePath: defaultLayer });
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
          key: removeTarget.key,
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
      title={t("settings.git.url_rewrites_title")}
      testId={TEST_IDS.gitConfigSettings.urlRewritesEditor.root}
    >
      <CustomTable>
        {rewrites.length === 0 && <CustomEmpty>{t("settings.git.url_rewrites_empty")}</CustomEmpty>}
        {rewrites.map((entry) => (
          <UrlRowItem
            key={entry.key}
            entry={entry}
            onCommit={commitInlineEdit}
            onRequestRemove={setRemoveTarget}
            fromLabel={t("settings.git.url_rewrite_from_label")}
            insteadOfLabel={t("settings.git.direction_insteadof")}
            pushInsteadOfLabel={t("settings.git.direction_pushinsteadof")}
            removeLabel={t("settings.git.remove")}
          />
        ))}

        {writableLayers.length > 0 && (
          <InlineAddForm>
            <TextField
              size="small"
              placeholder={t("settings.git.url_rewrite_from_label")}
              value={draft.from}
              onChange={(e) => setDraft((p) => ({ ...p, from: e.target.value }))}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.urlRewritesEditor.addFromInput,
                },
              }}
            />
            <TextField
              size="small"
              placeholder={t("settings.git.url_rewrite_to_label")}
              value={draft.to}
              onChange={(e) => setDraft((p) => ({ ...p, to: e.target.value }))}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.urlRewritesEditor.addToInput,
                },
              }}
            />
            <TextField
              select
              size="small"
              value={draft.direction}
              onChange={(e) => setDraft((p) => ({ ...p, direction: e.target.value as Direction }))}
              slotProps={{
                htmlInput: {
                  "data-testid": TEST_IDS.gitConfigSettings.urlRewritesEditor.addDirectionSelect,
                },
              }}
            >
              <MenuItem value="insteadOf">{t("settings.git.direction_insteadof")}</MenuItem>
              <MenuItem value="pushInsteadOf">{t("settings.git.direction_pushinsteadof")}</MenuItem>
            </TextField>
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
                    "data-testid": TEST_IDS.gitConfigSettings.urlRewritesEditor.addLayerSelect,
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
                disabled={!draft.from.trim() || !draft.to.trim() || !draft.filePath}
                data-testid={TEST_IDS.gitConfigSettings.urlRewritesEditor.addSubmit}
              >
                {t("settings.git.add_url_rewrite_submit")}
              </GeneralButton>
            </AddFormActions>
            {error && <InlineErrorText>{error}</InlineErrorText>}
          </InlineAddForm>
        )}
      </CustomTable>

      <ConfirmationModal
        open={removeTarget !== null}
        title={t("settings.git.remove_url_rewrite_title")}
        description={t("settings.git.remove_url_rewrite_body")}
        confirmLabel={t("settings.git.remove")}
        cancelLabel={t("settings.git.cancel")}
        destructive
        onCancel={() => (submitting ? undefined : setRemoveTarget(null))}
        onConfirm={() => void confirmRemove()}
      />
    </SettingsSection>
  );
}

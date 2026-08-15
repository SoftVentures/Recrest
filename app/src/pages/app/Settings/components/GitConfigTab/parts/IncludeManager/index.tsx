import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { GitConfigLayer } from "@recrest/shared";

import { AlertTriangle, FolderOpen, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import GeneralIconButton, {
  ICON_BUTTON_ICON_SIZES,
  IconButtonSize,
  IconButtonTone,
} from "@/components/atoms/buttons/GeneralIconButton";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import AddGitConfigIncludeModal from "@/components/molecules/modals/AddGitConfigIncludeModal";
import GeneralModal from "@/components/molecules/modals/GeneralModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { revealPathInSystem } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { SettingsSection } from "@/pages/app/Settings/components/SettingsPrimitives";
import {
  addGitConfigInclude,
  removeGitConfigInclude,
  setGitConfigInLayer,
} from "@/store/actions/repos.actions";
import { useAppDispatch } from "@/store/hooks";
import { fontPxToRem, mediaDown, pxToRem, pxToRems } from "@/theme/scale";

const Empty = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.information,
  fontStyle: "italic",
  padding: pxToRems(10, 14),
  border: `1px dashed ${theme.palette.divider}`,
  borderRadius: 8,
})) as typeof Typography;

interface RowProps {
  $inactive: boolean;
}

const Row = styled(Box, {
  shouldForwardProp: (p) => p !== "$inactive",
})<RowProps>(({ theme, $inactive }) => ({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(10),
  padding: pxToRems(12, 14),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  background: theme.palette.surface.interface.base,
  opacity: $inactive ? 0.65 : 1,
}));

const RowHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(10),
  justifyContent: "space-between",
  minWidth: 0,
  flexWrap: "wrap",
}) as typeof Box;

const RowHeaderLeft = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(8),
  flex: `1 1 ${pxToRem(280)}`,
  minWidth: 0,
}) as typeof Box;

const ConditionChip = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: pxToRem(4),
  padding: pxToRems(2, 8),
  borderRadius: 999,
  background: theme.palette.surface.interface.backElevation,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(11),
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  whiteSpace: "nowrap",
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

interface PathProps {
  $clickable: boolean;
}

const PathText = styled(Typography, {
  shouldForwardProp: (p) => p !== "$clickable",
})<PathProps>(({ theme, $clickable }) => ({
  fontSize: fontPxToRem(12),
  color: theme.palette.text.primary,
  fontFamily: MONO_STACK,
  cursor: $clickable ? "pointer" : "default",
  textDecoration: $clickable ? "underline dotted transparent" : "none",
  transition: "color 120ms ease",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: "1 1 auto",
  minWidth: 0,
  "&:hover": $clickable
    ? {
        color: theme.palette.primary.main,
        textDecorationColor: theme.palette.primary.main,
      }
    : undefined,
}));

const QuickRow = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: `minmax(${pxToRem(180)}, 1fr) minmax(${pxToRem(220)}, 1.4fr)`,
  gap: pxToRem(10),
  [mediaDown(900, theme.uiScale)]: {
    gridTemplateColumns: "1fr",
  },
})) as typeof Box;

const RowActions = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: pxToRem(4),
  flex: "0 0 auto",
}) as typeof Box;

const InactivePill = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  padding: pxToRems(2, 8),
  borderRadius: 999,
  border: `1px solid ${theme.palette.divider}`,
  fontSize: fontPxToRem(10.5),
  color: theme.palette.text.information,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  fontWeight: 600,
  background: theme.palette.surface.interface.backElevation,
})) as typeof Box;

const MissingIcon = styled(Box)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  color: theme.palette.warning.main,
})) as typeof Box;

const ConfirmBody = styled(Box)({
  display: "flex",
  flexDirection: "column",
  gap: pxToRem(12),
  padding: pxToRems(8, 0),
}) as typeof Box;

const ConfirmDescription = styled(Typography)(({ theme }) => ({
  fontSize: fontPxToRem(13),
  color: theme.palette.text.primary,
})) as typeof Typography;

const Footer = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  paddingTop: pxToRem(4),
}) as typeof Box;

export interface IncludeManagerProps {
  layers: GitConfigLayer[];
  rootConfigFile: string;
  onRefresh: () => Promise<void>;
}

interface QuickDraft {
  name: string;
  email: string;
}

function deriveHomeDir(rootConfigFile: string): string | null {
  if (!rootConfigFile) return null;
  const idx = Math.max(rootConfigFile.lastIndexOf("/"), rootConfigFile.lastIndexOf("\\"));
  if (idx <= 0) return null;
  return rootConfigFile.slice(0, idx);
}

export default function IncludeManager({ layers, rootConfigFile, onRefresh }: IncludeManagerProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);
  const dispatch = useAppDispatch();

  // The row key is `${path}::${condition}` so two distinct gitdir patterns
  // pointing at the same identity file each render as their own row. Defend
  // against literal-duplicate (path, condition) pairs the backend could
  // theoretically return — they would collide on key + confuse the remove
  // flow.
  const includeLayers = useMemo(() => {
    const seen = new Set<string>();
    return layers.filter((l) => {
      if (l.condition === null) return false;
      const key = `${l.path}::${l.condition}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [layers]);

  const initialDraftsByPath = useMemo(() => {
    const out: Record<string, QuickDraft> = {};
    for (const layer of includeLayers) {
      out[layer.path] = {
        name: layer.entries["user.name"] ?? "",
        email: layer.entries["user.email"] ?? "",
      };
    }
    return out;
  }, [includeLayers]);

  const [drafts, setDrafts] = useState<Record<string, QuickDraft>>({});

  useEffect(() => {
    setDrafts(initialDraftsByPath);
  }, [initialDraftsByPath]);

  const [addOpen, setAddOpen] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<GitConfigLayer | null>(null);
  const [removeDeleteFile, setRemoveDeleteFile] = useState(false);
  const [removeBusy, setRemoveBusy] = useState(false);

  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;

  const updateDraft = (path: string, patch: Partial<QuickDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [path]: { name: "", email: "", ...prev[path], ...patch },
    }));
  };

  const saveQuick = async (path: string, key: "user.name" | "user.email") => {
    const draft = draftsRef.current[path];
    if (!draft) return;
    const initial = initialDraftsByPath[path] ?? { name: "", email: "" };
    const value = key === "user.name" ? draft.name : draft.email;
    const previous = key === "user.name" ? initial.name : initial.email;
    if (value === previous) return;
    try {
      await dispatch(setGitConfigInLayer({ repoId: null, filePath: path, key, value })).unwrap();
      toast.success(t("settings.git.save_success"));
      void onRefresh();
    } catch (err) {
      toast.error(`${t("settings.git.save_error")}: ${String((err as Error)?.message ?? err)}`);
    }
  };

  const reveal = async (layer: GitConfigLayer) => {
    if (!layer.exists) return;
    await revealPathInSystem(layer.path);
  };

  const openRemove = (layer: GitConfigLayer) => {
    setRemoveDeleteFile(false);
    setRemoveTarget(layer);
  };

  const cancelRemove = () => {
    if (removeBusy) return;
    setRemoveTarget(null);
  };

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setRemoveBusy(true);
    try {
      await dispatch(
        removeGitConfigInclude({
          configFile: rootConfigFile,
          condition: removeTarget.condition,
          targetPath: removeTarget.path,
          deleteTargetFile: removeDeleteFile,
        }),
      ).unwrap();
      setRemoveTarget(null);
      await onRefresh();
    } catch (err) {
      toast.error(String((err as Error)?.message ?? err));
    } finally {
      setRemoveBusy(false);
    }
  };

  const handleAddSubmit = async (args: {
    configFile: string;
    condition: string;
    targetPath: string;
    createTargetSkeleton: boolean;
  }) => {
    await dispatch(addGitConfigInclude(args)).unwrap();
    setAddOpen(false);
    await onRefresh();
  };

  const homeDir = deriveHomeDir(rootConfigFile);

  return (
    <SettingsSection
      title={t("settings.git.identities_title")}
      testId={TEST_IDS.gitConfigSettings.includeManager.root}
    >
      {includeLayers.length === 0 && (
        <Empty data-testid={TEST_IDS.gitConfigSettings.includeManager.empty}>
          {t("settings.git.identities_empty")}
        </Empty>
      )}

      {includeLayers.map((layer) => {
        const condition = layer.condition ?? "";
        const draft = drafts[layer.path] ?? { name: "", email: "" };
        return (
          <Row
            key={`${layer.path}::${condition}`}
            $inactive={!layer.active}
            data-testid={TEST_IDS.gitConfigSettings.includeManager.row(condition)}
          >
            <RowHeader>
              <RowHeaderLeft>
                <ConditionChip>{condition}</ConditionChip>
                <PathText
                  $clickable={layer.exists}
                  onClick={layer.exists ? () => void reveal(layer) : undefined}
                  title={layer.path}
                >
                  {layer.path}
                </PathText>
                {!layer.active && (
                  <GeneralTooltip title={t("settings.git.include_inactive")} placement="top">
                    <InactivePill>{t("settings.git.include_inactive")}</InactivePill>
                  </GeneralTooltip>
                )}
                {!layer.exists && (
                  <GeneralTooltip title={t("settings.git.include_missing_file")} placement="top">
                    <MissingIcon>
                      <AlertTriangle size={pxToRem(14)} color="currentColor" />
                    </MissingIcon>
                  </GeneralTooltip>
                )}
              </RowHeaderLeft>
              <RowActions>
                <GeneralTooltip title={t("settings.git.include_reveal")} placement="top">
                  <Box component="span">
                    <GeneralIconButton
                      icon={<FolderOpen size={ICON_BUTTON_ICON_SIZES[IconButtonSize.SM]} />}
                      size={IconButtonSize.SM}
                      aria-label={t("settings.git.include_reveal")}
                      disabled={!layer.exists}
                      onClick={() => void reveal(layer)}
                      data-testid={TEST_IDS.gitConfigSettings.includeManager.rowReveal(condition)}
                    />
                  </Box>
                </GeneralTooltip>
                <GeneralTooltip title={t("settings.git.remove")} placement="top">
                  <Box component="span">
                    <GeneralIconButton
                      icon={<Trash2 size={ICON_BUTTON_ICON_SIZES[IconButtonSize.SM]} />}
                      size={IconButtonSize.SM}
                      tone={IconButtonTone.DANGER}
                      aria-label={t("settings.git.remove")}
                      onClick={() => openRemove(layer)}
                      data-testid={TEST_IDS.gitConfigSettings.includeManager.rowRemove(condition)}
                    />
                  </Box>
                </GeneralTooltip>
              </RowActions>
            </RowHeader>

            <QuickRow>
              <TextField
                size="small"
                label={t("settings.git.include_quick_user_name")}
                value={draft.name}
                disabled={!layer.exists}
                onChange={(e) => updateDraft(layer.path, { name: e.target.value })}
                onBlur={() => void saveQuick(layer.path, "user.name")}
                slotProps={{
                  htmlInput: {
                    "data-testid": TEST_IDS.gitConfigSettings.includeManager.rowUserName(condition),
                  },
                }}
              />
              <TextField
                size="small"
                label={t("settings.git.include_quick_user_email")}
                value={draft.email}
                disabled={!layer.exists}
                onChange={(e) => updateDraft(layer.path, { email: e.target.value })}
                onBlur={() => void saveQuick(layer.path, "user.email")}
                slotProps={{
                  htmlInput: {
                    "data-testid":
                      TEST_IDS.gitConfigSettings.includeManager.rowUserEmail(condition),
                  },
                }}
              />
            </QuickRow>
          </Row>
        );
      })}

      <Footer>
        <GeneralButton
          size="sm"
          variant="outline"
          onClick={() => setAddOpen(true)}
          startIcon={<Plus size={pxToRem(14)} />}
          disabled={!rootConfigFile}
          data-testid={TEST_IDS.gitConfigSettings.includeManager.addButton}
        >
          {t("settings.git.add_identity")}
        </GeneralButton>
      </Footer>

      <AddGitConfigIncludeModal
        open={addOpen}
        configFile={rootConfigFile}
        homeDir={homeDir}
        onCancel={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
      />

      <GeneralModal
        open={removeTarget !== null}
        modalWidth={460}
        customTitle={t("settings.git.remove_identity_title")}
        textCapitalize={false}
        onCloseModal={cancelRemove}
        data-testid={TEST_IDS.gitConfigSettings.removeIncludeConfirm.root}
        contentChildren={
          <ConfirmBody>
            <ConfirmDescription>{t("settings.git.remove_identity_body")}</ConfirmDescription>
            {removeTarget && (
              <FormControlLabel
                control={
                  <Checkbox
                    size="small"
                    color="primary"
                    checked={removeDeleteFile}
                    onChange={(e) => setRemoveDeleteFile(e.target.checked)}
                    slotProps={{
                      input: {
                        "data-testid":
                          TEST_IDS.gitConfigSettings.removeIncludeConfirm.deleteFileToggle,
                      } as React.InputHTMLAttributes<HTMLInputElement>,
                    }}
                  />
                }
                label={
                  <Typography component="span" variant="body2">
                    {t("settings.git.remove_identity_delete_file_label")} {removeTarget.path}
                  </Typography>
                }
              />
            )}
          </ConfirmBody>
        }
        actionsChildren={
          <>
            <GeneralButton
              variant="ghost"
              onClick={cancelRemove}
              disabled={removeBusy}
              data-testid={TEST_IDS.gitConfigSettings.removeIncludeConfirm.cancel}
            >
              {t("settings.git.cancel")}
            </GeneralButton>
            <GeneralButton
              variant="destructive"
              onClick={() => void confirmRemove()}
              loading={removeBusy}
              data-testid={TEST_IDS.gitConfigSettings.removeIncludeConfirm.confirm}
            >
              {t("settings.git.remove")}
            </GeneralButton>
          </>
        }
      />
    </SettingsSection>
  );
}

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Radio, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Folder, FolderOpen, Plus, X } from "lucide-react";
import { toast } from "sonner";

import GeneralIconButton, { IconButtonSize } from "@/components/atoms/buttons/GeneralIconButton";
import GeneralCard from "@/components/atoms/cards/GeneralCard";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import { forgetReposUnderPath, scanForRepos, setScanPaths } from "@/store/actions/repos.actions";
import { saveSettings } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

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

const InputRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 8,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native form control required for accessibility / autofocus / IME
const TextInput = styled("input")(({ theme }) => ({
  flex: 1,
  minWidth: 0,
  height: 32,
  padding: "0 10px",
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.primary,
  fontSize: 12,
  fontFamily: MONO_STACK,
  outline: "none",
  "&::placeholder": { color: theme.palette.text.informationLight },
  "&:focus": { borderColor: theme.palette.border.hover },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const BrowseBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 12px",
  border: `1px solid ${theme.palette.divider}`,
  backgroundColor: theme.palette.surface.interface.base,
  color: theme.palette.text.primary,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    borderColor: theme.palette.border.hover,
  },
}));

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const AddBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 32,
  padding: "0 14px",
  border: `1px solid ${theme.palette.surface.button.cta}`,
  backgroundColor: theme.palette.surface.button.cta,
  color: theme.palette.surface.button.ctaContrast,
  borderRadius: 8,
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.button.ctaHover,
    borderColor: theme.palette.surface.button.ctaHover,
  },
}));

const PathRow = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 14px",
  marginBottom: 6,
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  color: theme.palette.text.primary,
  fontFamily: MONO_STACK,
  fontSize: 12,
})) as typeof Box;

const PathText = styled(Box)({ flex: 1, minWidth: 0 }) as typeof Box;

const DefaultBadge = styled(Box)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  color: theme.palette.primary.main,
  fontFamily: "inherit",
})) as typeof Box;

const AddRepoCard = styled(GeneralCard)(({ theme }) => ({
  marginBottom: theme.spacing(1.25),
}));

export function IntegrationsSection() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const paths = useAppSelector((s) => s.repos.scanPaths);
  const defaultScanPath = useAppSelector((s) => s.settings.backend?.defaultScanPath ?? null);
  // Used only to count how many repos a freshly added root surfaced (ids that
  // weren't known before the scan) so the success toast can report a number.
  const repoItems = useAppSelector((s) => s.repos.items);
  const [draft, setDraft] = useState("");

  // Adding a root scans it and reports via Sonner. `scanForRepos` persists the
  // new path list itself (it writes `scanPaths` before walking), so there's no
  // separate save round-trip — and the discovered repos land in the store in
  // the same gesture, which is the "data changes immediately" the editor owes.
  const addPath = async (path: string) => {
    const next = [...paths, path];
    const knownBefore = new Set(Object.keys(repoItems));
    dispatch(setScanPaths(next));
    const toastId = toast.loading(t("settings.integrations.scanning", { path }));
    try {
      const found = await dispatch(scanForRepos(next)).unwrap();
      const discovered = found.filter((repo) => !knownBefore.has(repo.id)).length;
      toast.success(
        discovered > 0
          ? t("settings.integrations.path_added", { path, count: discovered })
          : t("settings.integrations.path_added_none", { path }),
        { id: toastId },
      );
    } catch {
      // Roll the optimistic entry back out so the list never shows a root that
      // failed to persist.
      dispatch(setScanPaths(paths));
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }), { id: toastId });
    }
  };

  const onAdd = () => {
    const next = draft.trim();
    if (!next || paths.includes(next)) return;
    setDraft("");
    void addPath(next);
  };

  const onBrowse = async () => {
    if (!isTauri()) return;
    // Fall back to the user's preferred root (or the first existing scan
    // path) so a new entry usually starts as a sibling of what's there
    // already — beats reopening at $HOME every time.
    const fallback = defaultScanPath ?? paths[0] ?? undefined;
    const picked = await pickFolder(draft.trim() || fallback);
    if (picked && !paths.includes(picked)) {
      void addPath(picked);
    }
  };

  // Removing a root drops the repos it surfaced from the dashboard in the same
  // gesture (the backend prunes only repos not still covered by a remaining
  // root). The folder on disk is left alone.
  const onRemove = async (p: string) => {
    const previous = paths;
    const next = paths.filter((x) => x !== p);
    const nextDefault = defaultScanPath === p ? null : defaultScanPath;
    dispatch(setScanPaths(next));
    try {
      await dispatch(saveSettings({ scanPaths: next, defaultScanPath: nextDefault })).unwrap();
    } catch {
      // The path itself didn't persist — put it back so the editor stays
      // truthful, and bail before pruning anything.
      dispatch(setScanPaths(previous));
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
      return;
    }
    try {
      const forgotten = await dispatch(
        forgetReposUnderPath({ removedPath: p, remainingPaths: next }),
      ).unwrap();
      toast.success(
        forgotten.length > 0
          ? t("settings.integrations.path_removed", { path: p, count: forgotten.length })
          : t("settings.integrations.path_removed_none", { path: p }),
      );
    } catch {
      // The path is already gone; only the repo cleanup failed. Don't resurrect
      // the path — just report that the prune didn't complete.
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
    }
  };

  const onSetDefault = (p: string) => {
    void dispatch(saveSettings({ defaultScanPath: p }));
  };

  return (
    <Section component="section">
      <SectionLabel component="h3">{t("settings.integrations.scan")}</SectionLabel>
      <SectionDesc component="p" variant="body2">
        {t("settings.integrations.scan_sub")}
      </SectionDesc>

      <AddRepoCard
        title={t("settings.integrations.add")}
        sub={t("settings.integrations.add_sub")}
        padding="14px 16px"
        flushHeight
      >
        <InputRow>
          <TextInput
            placeholder={t("integrations.scan_placeholder", { ns: I18nNamespace.SETTINGS })}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === KEYBOARD_KEYS.ENTER) onAdd();
            }}
            data-testid={TEST_IDS.settings.integrations.scanInput}
          />
          <BrowseBtn
            type="button"
            onClick={() => void onBrowse()}
            disabled={!isTauri()}
            data-testid={TEST_IDS.settings.integrations.scanBrowse}
          >
            <FolderOpen size={13} />
            {t("integrations.browse", { ns: I18nNamespace.SETTINGS })}
          </BrowseBtn>
          <AddBtn
            type="button"
            onClick={onAdd}
            data-testid={TEST_IDS.settings.integrations.scanAdd}
          >
            <Plus size={13} />
            {t("integrations.add_button", { ns: I18nNamespace.SETTINGS })}
          </AddBtn>
        </InputRow>
      </AddRepoCard>

      {paths.map((p) => (
        <PathRow key={p}>
          <Folder size={13} />
          <PathText component="span">{p}</PathText>
          {defaultScanPath === p && (
            <DefaultBadge component="span">{t("settings.integrations.default_badge")}</DefaultBadge>
          )}
          <Radio
            size="small"
            checked={defaultScanPath === p}
            onChange={() => onSetDefault(p)}
            name="default-scan-path"
            data-testid={TEST_IDS.settings.integrations.scanDefaultRadio(p)}
            slotProps={{
              input: { "aria-label": t("settings.integrations.set_default", { path: p }) },
            }}
          />
          <GeneralIconButton
            size={IconButtonSize.SM}
            aria-label={t("settings.remove_path", { ns: I18nNamespace.ARIA, path: p })}
            onClick={() => void onRemove(p)}
            data-testid={TEST_IDS.settings.integrations.scanRemove(p)}
            icon={<X size={13} />}
          />
        </PathRow>
      ))}
    </Section>
  );
}

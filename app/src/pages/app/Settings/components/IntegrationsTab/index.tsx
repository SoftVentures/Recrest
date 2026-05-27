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
import { pickFolder } from "@/lib/utils/pickFolder.utils";
import { setScanPaths } from "@/store/actions/repos.actions";
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
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
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
  fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace',
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
  const [draft, setDraft] = useState("");

  const persist = async (next: string[], nextDefault: string | null) => {
    dispatch(setScanPaths(next));
    try {
      await dispatch(saveSettings({ scanPaths: next, defaultScanPath: nextDefault })).unwrap();
    } catch {
      toast.error(t("internal", { ns: I18nNamespace.ERRORS }));
    }
  };

  const onAdd = () => {
    const next = draft.trim();
    if (!next || paths.includes(next)) return;
    void persist([...paths, next], defaultScanPath);
    setDraft("");
  };

  const onBrowse = async () => {
    if (!isTauri()) return;
    const picked = await pickFolder(draft.trim() || undefined);
    if (picked && !paths.includes(picked)) {
      void persist([...paths, picked], defaultScanPath);
    }
  };

  const onRemove = (p: string) => {
    const next = paths.filter((x) => x !== p);
    void persist(next, defaultScanPath === p ? null : defaultScanPath);
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
            placeholder="/path/to/repos"
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
            Browse…
          </BrowseBtn>
          <AddBtn
            type="button"
            onClick={onAdd}
            data-testid={TEST_IDS.settings.integrations.scanAdd}
          >
            <Plus size={13} />
            Add
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
            onClick={() => onRemove(p)}
            data-testid={TEST_IDS.settings.integrations.scanRemove(p)}
            icon={<X size={13} />}
          />
        </PathRow>
      ))}
    </Section>
  );
}

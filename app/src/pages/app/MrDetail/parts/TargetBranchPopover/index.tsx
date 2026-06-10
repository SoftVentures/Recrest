import { useEffect, useMemo, useRef, useState } from "react";

import { useTranslation } from "react-i18next";

import { Box, Popover, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { type BranchInfo, TauriCommand } from "@recrest/shared";

import { Check, GitBranch, Search } from "lucide-react";

import GeneralButton from "@/components/atoms/buttons/GeneralButton";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { invoke, isTauri } from "@/lib/tauri";
import { MONO_STACK } from "@/lib/utils/appearance.utils";

interface Props {
  open: boolean;
  anchorEl: HTMLElement | null;
  repoId: string;
  currentTarget: string;
  onCancel: () => void;
  onApply: (branch: string) => void;
}

/** Popover for retargeting an MR. Lists the repo's branches (local + the
 *  upstream's remote-tracking branches) from `git_list_branches`, lets the
 *  user search and pick a new target. Apply hands the chosen branch back to
 *  the parent — provider-side update is the parent's responsibility. */
export default function TargetBranchPopover({
  open,
  anchorEl,
  repoId,
  currentTarget,
  onCancel,
  onApply,
}: Props) {
  const { t } = useTranslation(I18nNamespace.PRS);
  const [branches, setBranches] = useState<BranchInfo[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState(currentTarget);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setFilter("");
    setSelected(currentTarget);
    if (!isTauri()) return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await invoke<BranchInfo[]>(TauriCommand.GIT_LIST_BRANCHES, { repoId });
        if (!cancelled) setBranches(result);
      } catch {
        if (!cancelled) setBranches([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, repoId, currentTarget]);

  // Pre-sort: current target first, then locals (alphabetical), then remotes.
  // Filter is applied last so the order is stable across keystrokes.
  const filtered = useMemo(() => {
    const norm = (n: string) => n.replace(/^origin\//, "");
    const fq = filter.trim().toLowerCase();
    const seen = new Set<string>();
    const candidates: string[] = [];
    const push = (name: string) => {
      const clean = norm(name);
      if (!seen.has(clean) && (!fq || clean.toLowerCase().includes(fq))) {
        seen.add(clean);
        candidates.push(clean);
      }
    };
    push(currentTarget);
    for (const b of branches.filter((b) => !b.isRemote)) push(b.name);
    for (const b of branches.filter((b) => b.isRemote)) push(b.name);
    return candidates;
  }, [branches, filter, currentTarget]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onCancel}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
    >
      <Body data-testid={TEST_IDS.mr.targetPopover}>
        <HeaderRow>
          <HeaderTitle component="span">{t("detail.target_picker_title")}</HeaderTitle>
        </HeaderRow>
        <Label component="label">{t("detail.target_picker_label")}</Label>
        <SearchBox>
          <Search size={12} aria-hidden />
          <SearchInput
            ref={inputRef}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder={t("detail.target_picker_search")}
            autoFocus
            data-testid={TEST_IDS.mr.targetSearch}
            onKeyDown={(e) => {
              if (e.key === "Escape") onCancel();
            }}
          />
        </SearchBox>
        <Options>
          {filtered.length === 0 ? (
            <Empty>—</Empty>
          ) : (
            filtered.slice(0, 60).map((name) => {
              const active = name === selected;
              return (
                <OptionRow
                  key={name}
                  type="button"
                  selected={active}
                  onClick={() => setSelected(name)}
                  data-testid={TEST_IDS.mr.targetOption(name)}
                >
                  <GitBranch size={11} aria-hidden />
                  <OptionName component="span">{name}</OptionName>
                  {active && <Check size={11} aria-hidden />}
                </OptionRow>
              );
            })
          )}
        </Options>
        <Actions>
          <GeneralButton variant="ghost" onClick={onCancel}>
            {t("detail.cancel")}
          </GeneralButton>
          <GeneralButton
            variant="default"
            onClick={() => onApply(selected)}
            disabled={selected === currentTarget || !selected}
            data-testid={TEST_IDS.mr.targetApply}
          >
            {t("detail.target_apply")}
          </GeneralButton>
        </Actions>
      </Body>
    </Popover>
  );
}

const Body = styled(Box)(({ theme }) => ({
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: 12,
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

const HeaderRow = styled(Box)({
  display: "flex",
  alignItems: "center",
  gap: 6,
}) as typeof Box;

const HeaderTitle = styled(Typography)(({ theme }) => ({
  fontSize: 12,
  fontWeight: 700,
  color: theme.palette.text.primary,
})) as typeof Typography;

const Label = styled(Typography)(({ theme }) => ({
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: theme.palette.text.information,
})) as typeof Typography;

const SearchBox = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "0 10px",
  height: 30,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  backgroundColor: theme.palette.background.default,
  color: theme.palette.text.information,
})) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <input> required for accessibility / autofocus / IME inside the popover
const SearchInput = styled("input")(({ theme }) => ({
  flex: 1,
  border: "none",
  outline: "none",
  background: "transparent",
  fontFamily: "inherit",
  fontSize: 12,
  color: theme.palette.text.primary,
}));

const Options = styled(Box)({
  display: "flex",
  flexDirection: "column",
  maxHeight: 200,
  overflowY: "auto",
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- native <button> required for the keyboard-focusable branch option rows
const OptionRow = styled("button", {
  shouldForwardProp: (p) => p !== "selected",
})<{ selected: boolean }>(({ theme, selected }) => ({
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 8px",
  borderRadius: 6,
  border: "none",
  background: selected ? theme.palette.surface.interface.active : "transparent",
  color: selected ? theme.palette.text.primary : theme.palette.text.information,
  cursor: "pointer",
  fontFamily: MONO_STACK,
  fontSize: 11.5,
  textAlign: "left",
  "&:hover": {
    background: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -1,
  },
}));

const OptionName = styled(Typography)({
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: "inherit",
  fontFamily: "inherit",
  color: "inherit",
}) as typeof Typography;

const Empty = styled(Typography)(({ theme }) => ({
  padding: "8px 4px",
  color: theme.palette.text.information,
  fontSize: 12,
})) as typeof Typography;

const Actions = styled(Box)({
  display: "flex",
  justifyContent: "flex-end",
  gap: 6,
  marginTop: 4,
}) as typeof Box;

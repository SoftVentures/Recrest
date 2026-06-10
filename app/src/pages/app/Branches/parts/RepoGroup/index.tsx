import { useState } from "react";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { TauriCommand } from "@recrest/shared";

import { ChevronDown, RefreshCw } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import {
  PAGE_DUR_MD,
  PAGE_EASE,
  pgZoom,
  prefersReducedMotionGuard,
  staggerNthOfType,
} from "@/lib/animations/pageAnimations";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { MONO_STACK } from "@/lib/utils/appearance.utils";
import BranchRowItem from "@/pages/app/Branches/parts/BranchRowItem";
import { type BranchesByRepo, SpinIcon } from "@/pages/app/Branches/parts/_shared";

export interface RepoGroupProps {
  group: BranchesByRepo;
  busyKey: string | null;
  run: (key: string, cmd: string, args: Record<string, unknown>, okMsg: string) => Promise<void>;
  t: (key: string, opts?: Record<string, unknown>) => string;
}

export function RepoGroup({ group, busyKey, run, t }: RepoGroupProps) {
  const { repo, branches } = group;
  const [collapsed, setCollapsed] = useState(false);
  const fetchKey = `${repo.id}:fetch`;
  const isFetching = busyKey === fetchKey;
  const open = !collapsed;

  const toggle = () => setCollapsed((c) => !c);

  return (
    <GroupCard
      data-testid={TEST_IDS.branches.group}
      data-repo-id={repo.id}
      data-open={open || undefined}
    >
      <GroupHead>
        <GroupHandle
          role="button"
          tabIndex={0}
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={(e) => {
            if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
              e.preventDefault();
              toggle();
            }
          }}
        >
          <ChevronDown
            size={12}
            style={{
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
              transition: "transform 120ms ease",
            }}
          />
          <RepoAvatar repo={repo} size={22} radius={5} />
          <GroupName component="span" variant="caption">
            {repo.name}
          </GroupName>
          <GroupRemote component="span" variant="caption">
            {repo.remoteUrl ?? ""}
          </GroupRemote>
          <GroupCount component="span" variant="caption">
            {t("branches.branches_count", { count: branches.length })}
          </GroupCount>
        </GroupHandle>
        <FetchBtn
          type="button"
          disabled={isFetching}
          onClick={(e) => {
            e.stopPropagation();
            void run(
              fetchKey,
              TauriCommand.GIT_FETCH,
              { repoId: repo.id },
              t("branches.actions.fetched", { repo: repo.name }),
            );
          }}
        >
          {isFetching ? <SpinIcon size={12} /> : <RefreshCw size={12} />}
          {isFetching ? t("branches.actions.fetching") : t("branches.actions.fetch")}
        </FetchBtn>
      </GroupHead>
      {open && (
        <List>
          {branches.map((b) => (
            <BranchRowItem
              key={(b.isRemote ? `r:${b.remote}/` : "l:") + b.name}
              repo={repo}
              branch={b}
              busyKey={busyKey}
              run={run}
              t={t}
            />
          ))}
        </List>
      )}
    </GroupCard>
  );
}

export default RepoGroup;

const GroupCard = styled(Box)(({ theme }) => ({
  backgroundColor: theme.palette.surface.interface.base,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 8,
  overflow: "hidden",
  animation: `${pgZoom} ${PAGE_DUR_MD}ms ${PAGE_EASE} both`,
  ...staggerNthOfType({ step: 80, count: 8 }),
  ...prefersReducedMotionGuard,
})) as typeof Box;

const GroupHead = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "11px 16px",
  backgroundColor: theme.palette.surface.interface.backElevation,
  borderBottom: `1px solid ${theme.palette.divider}`,
})) as typeof Box;

const GroupHandle = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
  minWidth: 0,
  cursor: "pointer",
  color: theme.palette.text.primary,
  background: "transparent",
  border: 0,
  fontFamily: "inherit",
  textAlign: "left",
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: -2,
    borderRadius: 8,
  },
})) as typeof Box;

const GroupName = styled(Typography)(({ theme }) => ({
  fontSize: 13,
  fontWeight: 700,
  color: theme.palette.text.primary,
  letterSpacing: "-0.1px",
})) as typeof Typography;

const GroupRemote = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  flex: 1,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
})) as typeof Typography;

const GroupCount = styled(Typography)(({ theme }) => ({
  fontSize: 11,
  color: theme.palette.text.information,
  fontVariantNumeric: "tabular-nums",
})) as typeof Typography;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const FetchBtn = styled("button")(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 24,
  padding: "0 8px",
  marginLeft: 4,
  backgroundColor: "transparent",
  border: "1px solid transparent",
  borderRadius: 8,
  color: theme.palette.text.secondary,
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "background 120ms ease, color 120ms ease",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
    color: theme.palette.text.primary,
  },
  "&:disabled": { opacity: 0.55, cursor: "default" },
}));

const List = styled(Box)({
  display: "flex",
  flexDirection: "column",
}) as typeof Box;

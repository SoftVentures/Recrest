import { type KeyboardEvent } from "react";

import { useTranslation } from "react-i18next";

import { Box, Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { RepoSortKey } from "@recrest/shared";

import { ChevronDown, ChevronUp } from "lucide-react";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { KEYBOARD_KEYS } from "@/lib/constants/keyboard.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

const TableHead = styled(Box)(({ theme }) => ({
  display: "grid",
  gridTemplateColumns: "minmax(220px, 1.6fr) minmax(130px, 0.9fr) 110px 120px minmax(140px, auto)",
  alignItems: "center",
  gap: 12,
  padding: "10px 16px",
  borderBottom: `1px solid ${theme.palette.divider}`,
  position: "sticky",
  top: 0,
  backgroundColor: theme.palette.surface.interface.base,
  zIndex: 1,
})) as typeof Box;

const HeadCell = styled(Typography)(({ theme }) => ({
  margin: 0,
  fontSize: 10.5,
  fontWeight: 600,
  lineHeight: 1,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: theme.palette.text.information,
})) as typeof Typography;

const SortCell = styled(HeadCell)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  cursor: "pointer",
  userSelect: "none",
  width: "fit-content",
  borderRadius: 4,
  transition: "color 0.12s ease",
  "&:hover": { color: theme.palette.text.primary },
  "&[data-active='true']": { color: theme.palette.text.primary },
  "&:focus-visible": {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
})) as typeof Typography;

const ActionsHeadCell = styled(HeadCell)({
  justifySelf: "end",
}) as typeof Typography;

type SortableCol = "name" | "status" | "lastModified";

function nextKey(base: SortableCol, cur: RepoSortKey): RepoSortKey {
  if (base === "name") return cur === "name:asc" ? "name:desc" : "name:asc";
  if (base === "lastModified") return "lastModified:desc";
  return "status:asc";
}

/** Active arrow for a column, or null when that column isn't the active sort. */
function arrowFor(base: SortableCol, sort: RepoSortKey): "asc" | "desc" | null {
  if (base === "name") {
    if (sort === "name:asc") return "asc";
    if (sort === "name:desc") return "desc";
    return null;
  }
  if (base === "lastModified") return sort === "lastModified:desc" ? "desc" : null;
  return sort === "status:asc" ? "asc" : null;
}

export interface RepoListHeadProps {
  sort?: RepoSortKey;
  onSort?: (key: RepoSortKey) => void;
}

export function RepoListHead({ sort = "default", onSort }: RepoListHeadProps) {
  const { t } = useTranslation(I18nNamespace.COMMON);

  const renderSortable = (base: SortableCol, label: string) => {
    if (!onSort) return <HeadCell>{label}</HeadCell>;
    const dir = arrowFor(base, sort);
    return (
      <SortCell
        role="button"
        tabIndex={0}
        data-testid={TEST_IDS.repos.sortHeader(base)}
        data-active={dir ? "true" : undefined}
        onClick={() => onSort(nextKey(base, sort))}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === KEYBOARD_KEYS.ENTER || e.key === KEYBOARD_KEYS.SPACE) {
            e.preventDefault();
            onSort(nextKey(base, sort));
          }
        }}
      >
        {label}
        {dir === "asc" && <ChevronUp size={12} />}
        {dir === "desc" && <ChevronDown size={12} />}
      </SortCell>
    );
  };

  const nameCol = renderSortable("name", t("repos.col.repository"));
  const statusCol = renderSortable("status", t("repos.col.status"));
  const activityCol = renderSortable("lastModified", t("repos.col.activity"));

  return (
    <TableHead>
      {nameCol}
      <HeadCell>{t("repos.col.branch")}</HeadCell>
      {statusCol}
      {activityCol}
      <ActionsHeadCell>{t("repos.col.actions")}</ActionsHeadCell>
    </TableHead>
  );
}

export default RepoListHead;

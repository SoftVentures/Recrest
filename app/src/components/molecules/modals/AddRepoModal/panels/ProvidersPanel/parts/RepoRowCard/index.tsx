import { type ReactNode } from "react";

import { useTranslation } from "react-i18next";

import { Checkbox } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { type RemoteRepository } from "@recrest/shared";

import { Check, X } from "lucide-react";

import {
  LangChip,
  LangDot,
  MetaBadge,
  RepoBody,
  RepoDesc,
  RepoMeta,
  RepoRow,
  RepoTitle,
  RepoTitleRow,
  RepoUpdatedAbsolute,
  RepoUpdatedColumn,
  RepoUpdatedRelative,
  Spin,
  StatusInline,
} from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/ProvidersPanel.styles";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { useDateTimeFormat } from "@/lib/utils/datetime.utils";
import { pxToRem } from "@/theme/scale";

const FlushCheckbox = styled(Checkbox)({ padding: 0 });

interface RepoRowCardProps {
  repo: RemoteRepository;
  selected: boolean;
  alreadyLocal: boolean;
  onToggle: () => void;
  progress?: string;
  /** When set, strip this slug prefix from `repo.fullName` because the
   *  containing group is already visible in the sidebar — no need to repeat
   *  `org/sub/...` in every row. */
  groupPrefix?: string | null;
}

export function RepoRowCard({
  repo,
  selected,
  alreadyLocal,
  onToggle,
  progress,
  groupPrefix,
}: RepoRowCardProps): ReactNode {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const theme = useTheme();
  const dt = useDateTimeFormat();
  const updatedIso = repo.pushedAt ?? repo.updatedAt;
  const displayName =
    groupPrefix && repo.fullName.startsWith(`${groupPrefix}/`)
      ? repo.fullName.slice(groupPrefix.length + 1)
      : repo.fullName;
  return (
    <RepoRow selected={selected} disabled={alreadyLocal}>
      <FlushCheckbox
        size="small"
        checked={selected}
        disabled={alreadyLocal}
        onChange={() => !alreadyLocal && onToggle()}
        data-testid={TEST_IDS.addRepoDialog.rowCheckbox}
      />
      <RepoBody>
        <RepoTitleRow>
          <RepoTitle component="span" variant="caption" title={repo.fullName}>
            {displayName}
          </RepoTitle>
          {repo.isPrivate && <MetaBadge tone="neutral">{t("add_modal.badge_private")}</MetaBadge>}
          {repo.isFork && <MetaBadge tone="neutral">{t("add_modal.badge_fork")}</MetaBadge>}
          {repo.isArchived && <MetaBadge tone="neutral">{t("add_modal.badge_archived")}</MetaBadge>}
          {alreadyLocal && (
            <MetaBadge tone="success">
              <Check size={pxToRem(9)} /> {t("add_modal.on_system")}
            </MetaBadge>
          )}
        </RepoTitleRow>
        {repo.description && <RepoDesc>{repo.description}</RepoDesc>}
        {repo.language && (
          <RepoMeta>
            <LangChip component="span">
              <LangDot component="span" variant="caption" />
              {repo.language}
            </LangChip>
          </RepoMeta>
        )}
      </RepoBody>
      {updatedIso && (
        <RepoUpdatedColumn title={updatedIso}>
          <RepoUpdatedRelative component="span" variant="caption">
            {dt.formatRelative(updatedIso)}
          </RepoUpdatedRelative>
          <RepoUpdatedAbsolute component="span" variant="caption">
            {dt.formatAbsolute(updatedIso, false)}
          </RepoUpdatedAbsolute>
        </RepoUpdatedColumn>
      )}
      {progress === "cloning" && (
        <StatusInline component="span" variant="caption">
          <Spin size={pxToRem(11)} />
          {t("add_modal.status_cloning")}
        </StatusInline>
      )}
      {progress === "done" && (
        <StatusInline
          component="span"
          variant="caption"
          style={{ color: theme.palette.success.main }}
        >
          <Check size={pxToRem(11)} /> {t("add_modal.status_done")}
        </StatusInline>
      )}
      {progress === "error" && (
        <StatusInline
          component="span"
          variant="caption"
          style={{ color: theme.palette.error.main }}
        >
          <X size={pxToRem(11)} /> {t("add_modal.status_failed")}
        </StatusInline>
      )}
    </RepoRow>
  );
}

export default RepoRowCard;

import { type ReactNode } from "react";

import { Box, Checkbox } from "@mui/material";
import { useTheme } from "@mui/material/styles";

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
  Spin,
  StatusInline,
} from "@/components/molecules/modals/AddRepoModal/panels/ProvidersPanel/ProvidersPanel.styles";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

interface RepoRowCardProps {
  repo: RemoteRepository;
  selected: boolean;
  alreadyLocal: boolean;
  onToggle: () => void;
  progress?: string;
}

export function RepoRowCard({
  repo,
  selected,
  alreadyLocal,
  onToggle,
  progress,
}: RepoRowCardProps): ReactNode {
  const theme = useTheme();
  return (
    <RepoRow selected={selected} disabled={alreadyLocal}>
      <Checkbox
        size="small"
        checked={selected}
        disabled={alreadyLocal}
        onChange={() => !alreadyLocal && onToggle()}
        sx={{ p: 0 }}
        data-testid={TEST_IDS.addRepoDialog.rowCheckbox}
      />
      <RepoBody>
        <RepoTitleRow>
          <RepoTitle component="span" variant="caption">
            {repo.fullName}
          </RepoTitle>
          {repo.isPrivate && <MetaBadge tone="neutral">private</MetaBadge>}
          {repo.isFork && <MetaBadge tone="neutral">fork</MetaBadge>}
          {repo.isArchived && <MetaBadge tone="neutral">archived</MetaBadge>}
          {alreadyLocal && (
            <MetaBadge tone="success">
              <Check size={9} /> on system
            </MetaBadge>
          )}
        </RepoTitleRow>
        {repo.description && <RepoDesc>{repo.description}</RepoDesc>}
        <RepoMeta>
          {repo.language && (
            <LangChip component="span">
              <LangDot component="span" variant="caption" />
              {repo.language}
            </LangChip>
          )}
          {repo.language && repo.updatedAt && (
            <Box component="span" aria-hidden>
              ·
            </Box>
          )}
          {repo.updatedAt && <Box component="span">updated {repo.updatedAt.slice(0, 10)}</Box>}
        </RepoMeta>
      </RepoBody>
      {progress === "cloning" && (
        <StatusInline component="span" variant="caption">
          <Spin size={11} />
          cloning…
        </StatusInline>
      )}
      {progress === "done" && (
        <StatusInline
          component="span"
          variant="caption"
          style={{ color: theme.palette.success.main }}
        >
          <Check size={11} /> done
        </StatusInline>
      )}
      {progress === "error" && (
        <StatusInline
          component="span"
          variant="caption"
          style={{ color: theme.palette.error.main }}
        >
          <X size={11} /> failed
        </StatusInline>
      )}
    </RepoRow>
  );
}

export default RepoRowCard;

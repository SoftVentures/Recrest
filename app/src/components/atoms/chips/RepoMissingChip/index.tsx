import { useTranslation } from "react-i18next";

import { Typography } from "@mui/material";
import { styled } from "@mui/material/styles";

import { FolderX } from "lucide-react";

import VisuallyHidden from "@/components/atoms/layout/VisuallyHidden";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { StatusTone, toneChip } from "@/lib/utils/toneColor.utils";

export interface RepoMissingChipProps {
  className?: string;
  /** Overridden on surfaces that can render next to a repo row (the detail
   *  pane), so E2E selectors stay unambiguous. */
  "data-testid"?: string;
}

const Root = styled(Typography)(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  maxWidth: "100%",
  padding: "2px 7px",
  borderRadius: 8,
  fontSize: 10.5,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  whiteSpace: "nowrap",
  ...toneChip(theme, StatusTone.ERROR),
})) as typeof Typography;

/**
 * Badge for a repository whose folder vanished from disk (`Repository.missing`).
 * The visible label stays short enough for a table cell; the full explanation
 * rides along as screen-reader-only text.
 */
function RepoMissingChip({
  className,
  "data-testid": testId = TEST_IDS.repos.missingBadge,
}: RepoMissingChipProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  const { t: tAria } = useTranslation(I18nNamespace.ARIA);

  return (
    <Root variant="caption" className={className} data-testid={testId}>
      <FolderX size={11} aria-hidden="true" />
      {t("status.missing")}
      <VisuallyHidden>{tAria("repo.missing")}</VisuallyHidden>
    </Root>
  );
}

export default RepoMissingChip;

import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { ChangedFile } from "@recrest/shared";

import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { CODE_LIGATURES, MONO_STACK } from "@/lib/utils/appearance.utils";
import { StatusTone, toneText } from "@/lib/utils/toneColor.utils";

export interface ChangedFilesListProps {
  files: ChangedFile[];
  truncated?: boolean;
  /** Override the height — default is 240. Pass `"auto"` to let the list grow
   *  to its natural height (used inside drawers that scroll themselves). */
  maxHeight?: number | "auto";
  className?: string;
}

const Root = styled(Box, {
  shouldForwardProp: (p) => p !== "maxHeight",
})<{ maxHeight: number | "auto" }>(({ maxHeight }) => ({
  display: "flex",
  flexDirection: "column",
  maxHeight: maxHeight === "auto" ? undefined : maxHeight,
  overflowY: maxHeight === "auto" ? "visible" : "auto",
  fontFamily: MONO_STACK,
  fontFeatureSettings: CODE_LIGATURES,
  fontSize: 12,
}));

const Row = styled(Box)(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 8,
  padding: "4px 0",
  borderBottom: `1px solid ${theme.palette.divider}`,
  "&:last-child": { border: 0 },
})) as typeof Box;

const Path = styled(Box)({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
}) as typeof Box;

// eslint-disable-next-line no-restricted-syntax -- typed prop variant requires generic element form
const KindBadge = styled("span", {
  shouldForwardProp: (p) => p !== "kind",
})<{ kind: string }>(({ theme, kind }) => {
  const infoColor = theme.palette.text.information ?? theme.palette.text.secondary;
  const palette: Record<string, { color: string; bg: string }> = {
    added: {
      color: toneText(theme, StatusTone.SUCCESS),
      bg: `color-mix(in srgb, ${theme.palette.success.main} 14%, transparent)`,
    },
    modified: {
      color: toneText(theme, StatusTone.PRIMARY),
      bg: `color-mix(in srgb, ${theme.palette.primary.main} 14%, transparent)`,
    },
    deleted: {
      color: toneText(theme, StatusTone.ERROR),
      bg: `color-mix(in srgb, ${theme.palette.error.main} 14%, transparent)`,
    },
    renamed: { color: infoColor, bg: theme.palette.surface.interface.backElevation },
  };
  const tone = palette[kind] ??
    palette.modified ?? { color: infoColor, bg: theme.palette.surface.interface.backElevation };
  return {
    fontFamily: "inherit",
    fontSize: 10,
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    padding: "1px 6px",
    borderRadius: 8,
    color: tone.color,
    backgroundColor: tone.bg,
    flexShrink: 0,
  };
});

const Truncated = styled(Box)(({ theme }) => ({
  textAlign: "center",
  paddingTop: theme.spacing(1),
  fontSize: 11,
  color: theme.palette.text.information,
})) as typeof Box;

/**
 * Renders a working-tree change list (path + change-kind badge) with the same
 * monospace styling that was historically inlined in RepoDetail. Used both by
 * the RepoDetail page and the RepoStats card; will also back the future
 * Cross-repo "files of interest" view.
 */
function ChangedFilesList({
  files,
  truncated = false,
  maxHeight = 240,
  className,
}: ChangedFilesListProps) {
  const { t } = useTranslation(I18nNamespace.REPOS);
  return (
    <Root maxHeight={maxHeight} className={className} data-testid={TEST_IDS.changedFilesList.root}>
      {files.map((f) => (
        <Row key={f.path} data-testid={TEST_IDS.changedFilesList.row}>
          <Path component="span">{f.path}</Path>
          <KindBadge kind={f.kind}>{f.kind}</KindBadge>
        </Row>
      ))}
      {truncated && (
        <Truncated data-testid={TEST_IDS.changedFilesList.truncated}>
          {t("changed_files.truncated")}
        </Truncated>
      )}
    </Root>
  );
}

export default ChangedFilesList;

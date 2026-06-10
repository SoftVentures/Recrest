import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";

import { RepoStatusChip } from "@recrest/shared";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import type { EnrichedRepo } from "@/lib/repoEnrich";

/** AttentionRow's `kind` is a narrowed subset of {@link RepoStatusChip}. */
export type AttentionKind = typeof RepoStatusChip.DIRTY | typeof RepoStatusChip.BEHIND;

export interface AttentionRowProps {
  repo: EnrichedRepo;
  kind: AttentionKind;
  onClick: () => void;
}

export function AttentionRow({ repo, kind, onClick }: AttentionRowProps) {
  const { t } = useTranslation();
  const theme = useTheme();
  return (
    <AttnRow type="button" onClick={onClick}>
      <RepoAvatar repo={repo} size={24} radius={5} />
      <AttnBody>
        <AttnName>{repo.name}</AttnName>
        <AttnSub>
          {kind === RepoStatusChip.DIRTY ? (
            <>
              {t("dash.attention.changed", { count: repo.filesChanged })} ·{" "}
              <Box component="span" style={{ color: theme.palette.success.main }}>
                +{repo.added}
              </Box>{" "}
              <Box component="span" style={{ color: theme.palette.error.main }}>
                −{repo.removed}
              </Box>
            </>
          ) : repo.status.behind === 1 ? (
            t("dash.attention.behind_one", { count: repo.status.behind })
          ) : (
            t("dash.attention.behind_other", { count: repo.status.behind })
          )}
        </AttnSub>
      </AttnBody>
      <AttnTag kind={kind}>{kind}</AttnTag>
    </AttnRow>
  );
}

export default AttentionRow;

// eslint-disable-next-line no-restricted-syntax -- native <button> element required for accessibility
const AttnRow = styled("button")(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 10px",
  borderRadius: 8,
  cursor: "pointer",
  background: "transparent",
  border: 0,
  width: "100%",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:hover": {
    backgroundColor: theme.palette.surface.interface.active,
  },
}));

const AttnBody = styled(Box)({
  flex: 1,
  minWidth: 0,
}) as typeof Box;

const AttnName = styled(Box)(({ theme }) => ({
  fontSize: 12.5,
  fontWeight: 600,
  color: theme.palette.text.primary,
})) as typeof Box;

const AttnSub = styled(Box)(({ theme }) => ({
  fontSize: 10.5,
  color: theme.palette.text.information,
  marginTop: 2,
  fontVariantNumeric: "tabular-nums",
})) as typeof Box;

interface AttnTagProps {
  kind: AttentionKind;
}

// eslint-disable-next-line no-restricted-syntax -- generic styled element required for typed props
const AttnTag = styled("span", {
  shouldForwardProp: (p) => p !== "kind",
})<AttnTagProps>(({ theme, kind }) => {
  const isDark = theme.palette.mode === "dark";
  const palette =
    kind === RepoStatusChip.DIRTY
      ? isDark
        ? { bg: "rgba(255, 179, 71, 0.18)", fg: "#ffb347" }
        : { bg: "#fdf1dc", fg: "#8f4700" }
      : isDark
        ? { bg: "rgba(123, 167, 255, 0.18)", fg: "#7ba7ff" }
        : { bg: "#e8f0ff", fg: "#1e52d4" };
  return {
    fontSize: 10,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    padding: "2px 8px",
    borderRadius: 100,
    backgroundColor: palette.bg,
    color: palette.fg,
  };
});

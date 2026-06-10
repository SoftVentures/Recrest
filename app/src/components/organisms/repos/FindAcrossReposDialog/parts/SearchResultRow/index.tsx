import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import type { SearchHit } from "@recrest/shared";

import { MONO_STACK, monoFont } from "@/lib/utils/appearance.utils";

interface Props {
  hit: SearchHit;
  /** Current query — used to highlight the matched span in the snippet. */
  query: string;
  onOpen: (hit: SearchHit) => void;
  ariaLabel: string;
  testId: string;
}

// eslint-disable-next-line no-restricted-syntax -- native <button> for keyboard semantics
const Row = styled("button")(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "stretch",
  gap: 3,
  padding: "8px 12px",
  background: "transparent",
  border: 0,
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "pointer",
  textAlign: "left",
  fontFamily: "inherit",
  color: "inherit",
  "&:last-of-type": { borderBottom: 0 },
  "&:hover, &:focus-visible": {
    outline: "none",
    background: theme.palette.surface.interface.active,
  },
}));

const Head = styled(Box)({
  display: "flex",
  alignItems: "baseline",
  gap: 6,
  minWidth: 0,
  fontSize: 11,
}) as typeof Box;

const RepoName = styled(Box)(({ theme }) => ({
  fontWeight: 600,
  color: theme.palette.text.primary,
  flexShrink: 0,
})) as typeof Box;

const Locator = styled(Box)(({ theme }) => ({
  color: theme.palette.text.information,
  fontFamily: MONO_STACK,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  minWidth: 0,
  // Keep the end of the path (filename + line) visible when it overflows.
  direction: "rtl",
  textAlign: "left",
})) as typeof Box;

const Snippet = styled(Box)(({ theme }) => ({
  ...monoFont,
  fontSize: 12,
  color: theme.palette.text.secondary,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
})) as typeof Box;

const Mark = styled(Box)(({ theme }) => ({
  display: "inline",
  borderRadius: 3,
  padding: "0 1px",
  color: theme.palette.text.primary,
  fontWeight: 700,
  background:
    theme.palette.mode === "dark"
      ? `${theme.palette.primary.main}55`
      : `${theme.palette.primary.main}33`,
})) as typeof Box;

/** Splits the (left-trimmed) line at the first case-insensitive occurrence of
 *  `query` so the matched span renders highlighted. Leading indentation is
 *  stripped so deeply-indented hits don't push the snippet off-screen. */
function renderSnippet(snippet: string, query: string) {
  const text = snippet.replace(/^\s+/, "");
  const needle = query.trim();
  if (!needle) return text;
  const idx = text.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <Mark component="mark">{text.slice(idx, idx + needle.length)}</Mark>
      {text.slice(idx + needle.length)}
    </>
  );
}

function SearchResultRow({ hit, query, onOpen, ariaLabel, testId }: Props) {
  return (
    <Row type="button" onClick={() => onOpen(hit)} aria-label={ariaLabel} data-testid={testId}>
      <Head>
        <RepoName component="span">{hit.repoName}</RepoName>
        <Locator component="span">
          {/* bdi keeps the rtl trick from reordering the colon/line number */}
          <bdi>
            {hit.path}:{hit.line}
          </bdi>
        </Locator>
      </Head>
      <Snippet component="span">{renderSnippet(hit.snippet, query)}</Snippet>
    </Row>
  );
}

export default SearchResultRow;

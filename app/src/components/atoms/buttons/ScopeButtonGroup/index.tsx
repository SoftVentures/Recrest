import { useTranslation } from "react-i18next";

import { Box } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Globe, Monitor } from "lucide-react";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";
import GeneralTooltip from "@/components/atoms/feedback/GeneralTooltip";
import { RepoAddScope } from "@/lib/constants/repoAddScope.constants";
import { TEST_IDS } from "@/lib/constants/testIds.constants";

export { RepoAddScope } from "@/lib/constants/repoAddScope.constants";

interface Props {
  value: RepoAddScope;
  onChange: (next: RepoAddScope) => void;
  /**
   * `expanded` (default) renders a horizontal Local / Global segment with
   * icon + label.
   * `collapsed` renders a vertical 2-button stack of icon-only toggles so the
   * control fits inside a 38px-wide collapsed sidebar.
   */
  variant?: "expanded" | "collapsed";
}

const FullWidthGroup = styled(GeneralButtonGroup)({
  width: "100%",
  display: "flex",
  "& .MuiToggleButtonGroup-grouped": {
    flex: "1 1 0",
    justifyContent: "center",
  },
});

const StackedGroup = styled(GeneralButtonGroup)(({ theme }) => ({
  "& .MuiToggleButtonGroup-grouped": {
    padding: 0,
    width: theme.spacing(4),
    height: theme.spacing(4),
    justifyContent: "center",
  },
}));

function ScopeButtonGroup({ value, onChange, variant = "expanded" }: Props) {
  const { t } = useTranslation();
  const localLabel = t("actions.add_scope.local");
  const globalLabel = t("actions.add_scope.global");

  const handleChange = (_: unknown, next: RepoAddScope | null) => {
    if (next) onChange(next);
  };

  if (variant === "collapsed") {
    return (
      <StackedGroup
        value={value}
        exclusive
        shape="square"
        density="sm"
        orientation="vertical"
        onChange={handleChange}
        aria-label="Add scope"
        data-testid={TEST_IDS.repos.addScope.root}
      >
        <GeneralButtonGroupItem
          value={RepoAddScope.LOCAL}
          shape="square"
          density="sm"
          aria-label={localLabel}
          data-testid={TEST_IDS.repos.addScope.local}
        >
          <GeneralTooltip title={localLabel} placement="right" arrow>
            <Monitor size={14} aria-hidden />
          </GeneralTooltip>
        </GeneralButtonGroupItem>
        <GeneralButtonGroupItem
          value={RepoAddScope.GLOBAL}
          shape="square"
          density="sm"
          aria-label={globalLabel}
          data-testid={TEST_IDS.repos.addScope.global}
        >
          <GeneralTooltip title={globalLabel} placement="right" arrow>
            <Globe size={14} aria-hidden />
          </GeneralTooltip>
        </GeneralButtonGroupItem>
      </StackedGroup>
    );
  }

  return (
    <FullWidthGroup
      value={value}
      exclusive
      shape="square"
      density="md"
      onChange={handleChange}
      aria-label="Add scope"
      data-testid={TEST_IDS.repos.addScope.root}
    >
      <GeneralButtonGroupItem
        value={RepoAddScope.LOCAL}
        shape="square"
        density="md"
        aria-label={localLabel}
        data-testid={TEST_IDS.repos.addScope.local}
      >
        <Monitor size={14} aria-hidden />
        <Box component="span">{localLabel}</Box>
      </GeneralButtonGroupItem>
      <GeneralButtonGroupItem
        value={RepoAddScope.GLOBAL}
        shape="square"
        density="md"
        aria-label={globalLabel}
        data-testid={TEST_IDS.repos.addScope.global}
      >
        <Globe size={14} aria-hidden />
        <Box component="span">{globalLabel}</Box>
      </GeneralButtonGroupItem>
    </FullWidthGroup>
  );
}

export default ScopeButtonGroup;

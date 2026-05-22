import { useTranslation } from "react-i18next";

import { Tooltip } from "@mui/material";
import { styled } from "@mui/material/styles";

import { Globe, Monitor } from "lucide-react";

import GeneralButtonGroup, {
  GeneralButtonGroupItem,
} from "@/components/atoms/buttons/GeneralButtonGroup";

export type RepoAddScope = "local" | "global";

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

function ScopeToggle({ value, onChange, variant = "expanded" }: Props) {
  const { t } = useTranslation();
  const localLabel = t("actions.add_scope.local", "Local");
  const globalLabel = t("actions.add_scope.global", "Global");

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
        data-testid="repo-add-scope"
      >
        <GeneralButtonGroupItem
          value="local"
          shape="square"
          density="sm"
          aria-label={localLabel}
          data-testid="repo-add-scope-local"
        >
          <Tooltip title={localLabel} placement="right" arrow>
            <Monitor size={14} aria-hidden />
          </Tooltip>
        </GeneralButtonGroupItem>
        <GeneralButtonGroupItem
          value="global"
          shape="square"
          density="sm"
          aria-label={globalLabel}
          data-testid="repo-add-scope-global"
        >
          <Tooltip title={globalLabel} placement="right" arrow>
            <Globe size={14} aria-hidden />
          </Tooltip>
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
      data-testid="repo-add-scope"
    >
      <GeneralButtonGroupItem
        value="local"
        shape="square"
        density="md"
        aria-label={localLabel}
        data-testid="repo-add-scope-local"
      >
        <Monitor size={14} aria-hidden />
        <span>{localLabel}</span>
      </GeneralButtonGroupItem>
      <GeneralButtonGroupItem
        value="global"
        shape="square"
        density="md"
        aria-label={globalLabel}
        data-testid="repo-add-scope-global"
      >
        <Globe size={14} aria-hidden />
        <span>{globalLabel}</span>
      </GeneralButtonGroupItem>
    </FullWidthGroup>
  );
}

export default ScopeToggle;

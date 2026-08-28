import { type MouseEvent, useState } from "react";

import { ChevronDown } from "lucide-react";

import RepoAvatar from "@/components/atoms/avatars/RepoAvatar";
import {
  ScopeAllGlyph,
  ScopeMenu,
  ScopeMenuItem,
  ScopeOptionLabel,
  ScopeTrigger,
  ScopeTriggerLabel,
} from "@/components/organisms/OverallSearch/OverallSearch.styles";
import { TEST_IDS } from "@/lib/constants/testIds.constants";
import { type EnrichedRepo } from "@/lib/repoEnrich";
import { pxToRem } from "@/theme/scale";

const SCOPE_ALL = "all";

export interface RepoScopeSelectProps {
  repos: EnrichedRepo[];
  /** Selected repo id, or undefined for "all repositories". */
  value: string | undefined;
  allLabel: string;
  ariaLabel: string;
  onChange: (id: string | undefined) => void;
}

/**
 * Repo-scope dropdown for the content tab. A native `<select>` can't render the
 * repo avatar inside its options, so this is a button + MUI menu showing the
 * avatar next to each repo name. Lives inside the search palette's custom
 * backdrop, so it stops key/click propagation to keep the palette's own
 * cursor/close handlers from also firing.
 */
export default function RepoScopeSelect({
  repos,
  value,
  allLabel,
  ariaLabel,
  onChange,
}: RepoScopeSelectProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const selected = value ? (repos.find((r) => r.id === value) ?? null) : null;

  const pick = (id: string | undefined) => {
    onChange(id);
    setAnchor(null);
  };

  return (
    <>
      <ScopeTrigger
        type="button"
        aria-haspopup="listbox"
        aria-label={ariaLabel}
        onClick={(e: MouseEvent<HTMLButtonElement>) => setAnchor(e.currentTarget)}
        onKeyDown={(e) => e.stopPropagation()}
        data-testid={TEST_IDS.searchOverlay.scopeSelect}
      >
        {selected ? <RepoAvatar repo={selected} size={18} radius={5} /> : <ScopeAllGlyph />}
        <ScopeTriggerLabel component="span">
          {selected ? selected.name : allLabel}
        </ScopeTriggerLabel>
        <ChevronDown size={pxToRem(13)} aria-hidden />
      </ScopeTrigger>
      <ScopeMenu
        anchorEl={anchor}
        open={!!anchor}
        onClose={() => setAnchor(null)}
        onKeyDown={(e) => e.stopPropagation()}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
      >
        <ScopeMenuItem
          selected={!value}
          onClick={() => pick(undefined)}
          data-testid={TEST_IDS.searchOverlay.scopeOption(SCOPE_ALL)}
        >
          <ScopeAllGlyph />
          <ScopeOptionLabel component="span">{allLabel}</ScopeOptionLabel>
        </ScopeMenuItem>
        {repos.map((r) => (
          <ScopeMenuItem
            key={r.id}
            selected={r.id === value}
            onClick={() => pick(r.id)}
            data-testid={TEST_IDS.searchOverlay.scopeOption(r.id)}
          >
            <RepoAvatar repo={r} size={18} radius={5} />
            <ScopeOptionLabel component="span">{r.name}</ScopeOptionLabel>
          </ScopeMenuItem>
        ))}
      </ScopeMenu>
    </>
  );
}

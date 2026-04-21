# Page Mount Animations

**Status:** proposal
**Owner:** (assign before implementation)

## Why

`ActivityPage` has a distinctive entry animation: the hero tiles, grid cards, and timeline rows fade+slide in staggered, and each chart plays its own data-arrival animation (bars grow, lines draw, arcs fill). Every other route lands statically. The result is that Activity feels alive and the other tabs feel inert by comparison.

Goal: every page gets its **own** signature mount animation — so navigating feels like entering a different room, not swapping divs.

Out of scope:

- Route-transition cross-fades between old and new page. Nice-to-have, but adds framer-motion-style machinery and fights Tauri's CSP. We stick with per-page mount animations (what Activity already does).
- Re-playing the animation on in-route data refreshes. Animation runs once per mount.

## Audit of the current state

| Page                     | File                                                       | Has mount animation?                                  |
| ------------------------ | ---------------------------------------------------------- | ----------------------------------------------------- |
| Dashboard                | `pages/DashboardPage.tsx`                                  | No                                                    |
| Repos (also `/changes`)  | `pages/ReposPage.tsx`                                      | No                                                    |
| RepoDetail (inline pane) | `pages/RepoDetailPage.tsx` + `organisms/layout/DetailPane` | Pane has `slideIn` only                               |
| Merge requests           | `pages/MergeRequestsPage.tsx`                              | No                                                    |
| Branches                 | `pages/BranchesPage.tsx`                                   | No                                                    |
| Activity                 | `pages/ActivityPage.tsx`                                   | **Yes** — `aActEnter` + chart-specific anims          |
| Settings                 | `pages/SettingsPage.tsx`                                   | No                                                    |
| Pull requests (legacy)   | `pages/PullRequestsPage.tsx`                               | No — but this route is scheduled for retirement, skip |

Existing infrastructure we can reuse:

- `@keyframes aActEnter` in `styles/views.css:2927` — translateY(12px)+fade+scale(0.985) for 420ms at `cubic-bezier(0.2, 0.8, 0.2, 1)`
- `@keyframes slideIn` in `styles/layout.css:811` — used by detail pane
- `@media (prefers-reduced-motion: reduce)` blocks — already wired for activity

## Shared primitives (new)

Before touching any page, add a small animation primitives file so the 8 pages don't each reinvent timing:

**`styles/page-anim.css`** (new) — imported from `styles/index.css`:

```css
/* Tokens */
:root {
  --page-ease: cubic-bezier(0.2, 0.8, 0.2, 1);
  --page-dur-sm: 320ms;
  --page-dur-md: 440ms;
  --page-dur-lg: 620ms;
  --page-stagger: 60ms; /* base step for per-child delays */
}

/* Shared keyframes reused across pages */
@keyframes pgRise {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pgFall {
  from {
    opacity: 0;
    transform: translateY(-14px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pgSlideL {
  from {
    opacity: 0;
    transform: translateX(-18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pgSlideR {
  from {
    opacity: 0;
    transform: translateX(18px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pgZoom {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
@keyframes pgStripe {
  from {
    opacity: 0;
    transform: scaleY(0);
    transform-origin: top;
  }
  to {
    opacity: 1;
    transform: scaleY(1);
  }
}

/* Stagger helper: `.pg-stagger > *:nth-child(n)` picks its delay from a
   data-index attribute or from --i custom property set inline. This keeps
   per-page CSS free of 20-line nth-child cascades. */
.pg-stagger > * {
  animation-fill-mode: both;
  animation-delay: calc(var(--i, 0) * var(--page-stagger));
}

@media (prefers-reduced-motion: reduce) {
  [class^="pg-"],
  [class*=" pg-"] {
    animation: none !important;
  }
}
```

Components that render lists (rows, cards, repos) opt in by adding `style={{ "--i": index }}` to each child.

## Per-page proposal

Each page owns one **hero motion** + one **content motion**. Keep the vocabulary narrow (rise / fall / slideL / slideR / zoom / stripe) so the app as a whole feels coherent; pages differ by combination and timing, not by visual idiom.

### Dashboard — "headline rising"

- Header/KPI card: `pgRise` (fast)
- Bento tiles: `pgZoom` staggered, 50ms step
- Bottom widgets: `pgRise` after bento finishes (+300ms)
- **Vibe:** numbers and aggregates pop into place.

### Repos — "list materialising from the left"

- Filter/search bar: `pgFall` (from top)
- Group headers: `pgRise`
- Repo rows: `pgSlideL` with 40ms stagger capped at 12 rows (then the rest just fades via shorter `pgRise` to keep total under ~1s)
- **Vibe:** a directory assembling itself on the shelf.

### Changes (same component as Repos, `dirtyOnly`) — "pulsing in"

- Same structure as Repos, but swap `pgSlideL` for `pgStripe` (top-down peel) to visually differentiate dirty-view from clean list.
- Can be controlled by a boolean prop that toggles a modifier class on the page container (`.p-repos`, `.p-repos.dirty`).

### RepoDetail (detail pane) — keep `slideIn` but add inner stagger

- Pane slide (existing).
- Inside: `.a-dp-hdr`, `.a-dp-section` children opt into `.pg-stagger` with `pgRise`, 60ms step.
- **Vibe:** drawer opens, contents unpack sequentially.

### Merge requests — "inbox sliding in from the right"

- Toolbar/filters: `pgFall`
- MR rows: `pgSlideR`, 50ms stagger capped at 10 rows
- Drawer (when a row is selected): reuse detail-pane slideIn, no change.
- **Vibe:** contrasts with repos' slideL — left vs right gives the two list pages distinct identities.

### Branches — "branches unfurling"

- Toolbar (filter pills + Fetch-all): `pgFall`
- Repo group (`.a-br-group`): `pgZoom` with 80ms stagger per repo
- Rows within a group: `pgRise` with `--i` per row, inherits delay offset from the group
- **Vibe:** matches the hierarchical shape of the page — groups then rows.

### Activity — keep as-is

- Already has `aActEnter` + chart animations. Only change: rename the staggered delay blocks to use `.pg-stagger` / `--i` so we don't maintain two indexing patterns. Pure refactor, no visual change.

### Settings — "tabs folding in"

- Header: `pgFall`
- Tab panel: `pgRise` on mount and on tab change (animation keyed by active tab id)
- Individual setting rows within the panel: staggered `pgRise` at a fast 30ms step so the block settles quickly.
- **Vibe:** quieter than the other pages — settings don't need flair.

## Implementation plan

1. **Primitives**
   - Add `app/src/styles/page-anim.css`
   - Import it from `app/src/styles/index.css` (or wherever global styles are aggregated)
   - Tokens land in `styles/tokens.css` only if they'd be reused outside anim (otherwise keep them in page-anim.css)
2. **Refactor Activity**
   - Replace the ad-hoc `nth-child(1..n)` delay cascade with `--i`-based stagger
   - Zero behaviour change; confirm via Storybook / a Playwright screenshot diff
3. **Dashboard** — smallest risk, do it first to validate the primitives end to end
4. **Repos + Changes** — share component, same commit
5. **Branches** — straightforward; rows/groups already have clear hooks
6. **Merge requests** — mirror of Repos with slideR
7. **Settings** — last, because tab-change re-animation needs a key on the panel
8. **RepoDetail inner stagger** — tiny extension of the existing slideIn
9. **Cleanup**: drop any leftover one-off animations that now overlap with the shared set

Each step is a separate commit so the user can review per-page.

## Testing strategy

- **Visual**: Playwright spec per page taking 3 screenshots (`0ms`, `200ms`, `settled`) with `page.waitForTimeout`. Land under `.screenshots/page-anim/<page>/`. Not run in CI — for local review only.
- **Reduced motion**: one Playwright spec with `{ contextOptions: { reducedMotion: 'reduce' } }` confirming no animation keyframes fire (check `getComputedStyle(...).animationName === 'none'` on a sample container from each page).
- **No regression** on existing Activity charts — `ActivityPage` visual snapshot test stays pinned.

## Open decisions (need user input before code)

1. **Animation length feel.** The Activity entry currently lands in ~1.2s total. Should other pages feel **faster** (snappier, ~600ms end-to-end) or **match** Activity's cadence? The draft above assumes "slightly faster" for lists and "match" for charts.
2. **Stagger cap.** When a Repos view has 40 rows, staggering all 40 is slow (>2s). Draft caps at 12 rows — acceptable? Or cap lower (8)?
3. **Re-animation on navigation back.** Route → route → route back. Today mount animations replay every time because React unmounts/remounts. Keep that behaviour? It's an "arrival" feeling each time. Alternative: store a "seen" flag in a React context so the same page this session animates once. Extra complexity, probably not worth it.
4. **Settings tab-change.** I proposed re-animating the panel on tab change. Could also be quiet (no anim on tab switch). Preference?

Once 1-4 are answered, the plan is ready to execute.

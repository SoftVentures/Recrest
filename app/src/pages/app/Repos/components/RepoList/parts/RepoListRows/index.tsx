import { motion } from "motion/react";

import { RepoCard } from "@/pages/app/Repos/components/RepoCard";
import { CardGrid, type RowsProps } from "@/pages/app/Repos/components/RepoList/parts/_shared";
import { RepoRow } from "@/pages/app/Repos/components/RepoRow";

// Wrap each row/card in `<motion.div layout>` so reordering (e.g. when the
// user pins/unpins a repo) animates smoothly to the new slot. `layoutId` is
// keyed to the stable repo id so motion tracks the same element across
// re-renders even when its array index changes.
const TRANSITION = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.7,
};

export function RepoListRows({ repos, selectedRepoId, onSelect, viewMode = "list" }: RowsProps) {
  if (viewMode === "card") {
    return (
      <CardGrid data-card-group-grid>
        {repos.map((r) => (
          <motion.div key={r.id} layout transition={TRANSITION}>
            <RepoCard repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
          </motion.div>
        ))}
      </CardGrid>
    );
  }
  return (
    <>
      {repos.map((r) => (
        <motion.div key={r.id} layout transition={TRANSITION}>
          <RepoRow repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
        </motion.div>
      ))}
    </>
  );
}

export default RepoListRows;

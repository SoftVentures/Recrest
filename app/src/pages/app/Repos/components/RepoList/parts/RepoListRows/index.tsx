import { RepoCard } from "@/pages/app/Repos/components/RepoCard";
import { CardGrid, type RowsProps } from "@/pages/app/Repos/components/RepoList/parts/_shared";
import { RepoRow } from "@/pages/app/Repos/components/RepoRow";

export function RepoListRows({ repos, selectedRepoId, onSelect, viewMode = "list" }: RowsProps) {
  if (viewMode === "card") {
    return (
      <CardGrid data-card-group-grid>
        {repos.map((r) => (
          <RepoCard key={r.id} repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
        ))}
      </CardGrid>
    );
  }
  return (
    <>
      {repos.map((r) => (
        <RepoRow key={r.id} repo={r} selected={selectedRepoId === r.id} onClick={onSelect} />
      ))}
    </>
  );
}

export default RepoListRows;

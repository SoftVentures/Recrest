import type { ReactNode } from "react";

interface InfoCardProps {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Generic titled card used in RepoDetailPage. Title + action on the
 *  header row, scrollable body below. */
export function InfoCard({ title, action, children, className }: InfoCardProps) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className ?? ""}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          {action}
        </header>
      )}
      <div className="p-3">{children}</div>
    </section>
  );
}

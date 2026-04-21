import { useTranslation } from "react-i18next";

import { Spinner } from "@/components/atoms/Spinner";
import { PrList } from "@/components/organisms/prs/PrList";
import { useAppSelector } from "@/store/hooks";

export function PullRequestsPage() {
  const { t } = useTranslation("prs");

  const error = useAppSelector((s) => s.prs.error);
  const loading = useAppSelector((s) => s.prs.loading);
  const hasData = useAppSelector((s) => Object.keys(s.prs.items).length > 0);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card p-4 sm:p-5">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </div>
      {error && (
        <div
          role="alert"
          className="border-b border-destructive/40 bg-destructive/10 px-4 py-2 text-xs text-destructive"
        >
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {loading && !hasData ? (
          <div className="flex h-full items-center justify-center gap-2 text-sm text-muted-foreground">
            <Spinner size="sm" />
            {t("states.loading", { ns: "common" })}
          </div>
        ) : (
          <PrList />
        )}
      </div>
    </div>
  );
}

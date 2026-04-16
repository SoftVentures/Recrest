import { useTranslation } from "react-i18next";

import { PrList } from "@/components/prs/PrList";
import { usePrPolling } from "@/hooks/useProviders";
import { useAppSelector } from "@/store/hooks";

export function PullRequestsPage() {
  const { t } = useTranslation("prs");
  usePrPolling();

  const error = useAppSelector((s) => s.prs.error);
  const loading = useAppSelector((s) => s.prs.loading);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card p-5">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </div>
      {error && (
        <div className="border-b border-destructive bg-destructive/10 p-3 text-xs text-destructive">
          {error}
        </div>
      )}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {t("states.loading", { ns: "common" })}
          </div>
        ) : (
          <PrList />
        )}
      </div>
    </div>
  );
}

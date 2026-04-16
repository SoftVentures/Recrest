import { useEffect } from "react";

import { useTranslation } from "react-i18next";

import { GeneralSettings } from "@/components/settings/GeneralSettings";
import { ProviderAuth } from "@/components/settings/ProviderAuth";
import { RepoSources } from "@/components/settings/RepoSources";
import { useAppDispatch } from "@/store/hooks";
import { loadProviders } from "@/store/slices/providersSlice";
import { loadSettings } from "@/store/slices/settingsSlice";

export function SettingsView() {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(loadSettings());
    void dispatch(loadProviders());
  }, [dispatch]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border bg-card p-5">
        <h1 className="text-xl font-semibold">{t("title")}</h1>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="mx-auto flex max-w-2xl flex-col gap-8">
          <GeneralSettings />
          <RepoSources />
          <ProviderAuth />
        </div>
      </div>
    </div>
  );
}

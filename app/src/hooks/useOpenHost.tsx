import { type ReactNode, useCallback, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { useTranslation } from "react-i18next";

import { AppRoute, PROVIDER_NAMES, matchProviderFromRemote, remoteToWebUrl } from "@recrest/shared";

import { toast } from "sonner";

import ConnectProviderPromptModal from "@/components/molecules/modals/ConnectProviderPromptModal";
import { I18nNamespace } from "@/lib/constants/i18n.constants";
import { SETTINGS_TAB_QUERY_PARAM, SettingsTab } from "@/lib/constants/settings.constants";
import { openExternal } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

/** Single source of truth for the "open the repo on its provider" affordance.
 *
 *  A git remote can be an SSH URL (`git@github.com:foo/bar.git`) that a browser
 *  can't open as-is, so we normalise to the web URL first. When the remote's
 *  provider is recognised but not connected in Recrest, we surface the
 *  connect-prompt modal (so PRs/CI light up too) while still letting the user
 *  open the page anyway. `modal` must be rendered by the caller. */
export function useOpenHost(remoteUrl: string | null | undefined) {
  const navigate = useNavigate();
  const { t } = useTranslation(I18nNamespace.COMMON);
  const connections = useAppSelector((s) => s.providers.connections);
  const [modalOpen, setModalOpen] = useState(false);

  const webUrl = useMemo(() => remoteToWebUrl(remoteUrl), [remoteUrl]);
  const provider = useMemo(() => matchProviderFromRemote(remoteUrl), [remoteUrl]);
  const connected = !!provider && !!connections[provider]?.connected;

  const launch = useCallback(() => {
    if (!webUrl) return;
    openExternal(webUrl).catch(() => {
      toast.error(
        provider
          ? t("open_host.failed_provider", { provider: PROVIDER_NAMES[provider] })
          : t("open_host.failed_generic"),
      );
    });
  }, [webUrl, provider, t]);

  const open = useCallback(() => {
    if (!webUrl) return;
    if (provider && !connected) {
      setModalOpen(true);
      return;
    }
    launch();
  }, [webUrl, provider, connected, launch]);

  const modal: ReactNode = provider ? (
    <ConnectProviderPromptModal
      open={modalOpen}
      providerId={provider}
      onConnect={() => {
        setModalOpen(false);
        navigate(`${AppRoute.SETTINGS}?${SETTINGS_TAB_QUERY_PARAM}=${SettingsTab.ACCOUNTS}`);
      }}
      onProceed={() => {
        setModalOpen(false);
        launch();
      }}
      onClose={() => setModalOpen(false)}
    />
  ) : null;

  return { webUrl, provider, connected, canOpen: !!webUrl, open, modal };
}

import { useState } from "react";

import { useTranslation } from "react-i18next";

import { PROVIDER_IDS, PROVIDER_NAMES, type ProviderId } from "@recrest/shared";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProviderToken, setProviderToken } from "@/store/slices/providersSlice";

export function ProviderAuth() {
  const { t } = useTranslation("settings");
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold">{t("sections.providers")}</h2>
      <ul className="divide-y divide-border rounded-md border border-border">
        {PROVIDER_IDS.map((id) => (
          <li key={id} className="p-3">
            <ProviderRow providerId={id} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProviderRow({ providerId }: { providerId: ProviderId }) {
  const { t } = useTranslation("settings");
  const dispatch = useAppDispatch();
  const connection = useAppSelector((s) => s.providers.connections[providerId]);
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const connected = connection?.connected ?? false;

  const handleConnect = async () => {
    if (!token.trim()) return;
    setSubmitting(true);
    try {
      await dispatch(setProviderToken({ providerId, token: token.trim() })).unwrap();
      setToken("");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    await dispatch(clearProviderToken(providerId)).unwrap();
  };

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{PROVIDER_NAMES[providerId]}</div>
        <div className="text-xs text-muted-foreground">
          {connected
            ? `${t("providers.status_connected")} ${connection?.username ? `· ${connection.username}` : ""}`
            : t("providers.status_disconnected")}
        </div>
      </div>
      {connected ? (
        <button
          type="button"
          onClick={() => void handleDisconnect()}
          className="h-8 rounded-md border border-border px-3 text-xs hover:bg-accent"
        >
          {t("providers.disconnect")}
        </button>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="password"
            placeholder={t("providers.token_placeholder")}
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="h-8 w-56 rounded-md border border-border bg-background px-2 text-xs"
          />
          <button
            type="button"
            disabled={submitting || !token.trim()}
            onClick={() => void handleConnect()}
            className="h-8 rounded-md bg-primary px-3 text-xs text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {t("providers.connect")}
          </button>
        </div>
      )}
    </div>
  );
}

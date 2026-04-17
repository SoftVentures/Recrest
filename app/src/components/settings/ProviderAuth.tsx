import { useState } from "react";

import { useTranslation } from "react-i18next";

import { PROVIDER_IDS, PROVIDER_NAMES, type ProviderId } from "@recrest/shared";

import { SettingsSection } from "@/components/settings/shared";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { InfoHint } from "@/components/ui/info-hint";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearProviderToken, setProviderToken } from "@/store/slices/providersSlice";

export function ProviderAuth() {
  const { t } = useTranslation("settings");
  return (
    <SettingsSection
      title={t("sections.providers")}
      description={t("providers.description")}
    >
      <ul className="divide-y divide-border rounded-md border border-border">
        {PROVIDER_IDS.map((id) => (
          <li key={id} className="p-3">
            <ProviderRow providerId={id} />
          </li>
        ))}
      </ul>
    </SettingsSection>
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
      toast.success(t("providers.connected", { name: PROVIDER_NAMES[providerId] }));
    } catch {
      toast.error(t("unauthorized", { ns: "errors" }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await dispatch(clearProviderToken(providerId)).unwrap();
      toast.success(t("providers.disconnected", { name: PROVIDER_NAMES[providerId] }));
    } catch {
      toast.error(t("internal", { ns: "errors" }));
    }
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium">{PROVIDER_NAMES[providerId]}</span>
          {connected ? (
            <Badge variant="success" size="sm">
              {t("providers.status_connected")}
            </Badge>
          ) : (
            <Badge variant="muted" size="sm">
              {t("providers.status_disconnected")}
            </Badge>
          )}
        </div>
        {connected && connection?.username && (
          <div className="truncate text-xs text-muted-foreground">
            {connection.username}
          </div>
        )}
      </div>
      {connected ? (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm">
              {t("providers.disconnect")}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("providers.confirm_disconnect_title", {
                  name: PROVIDER_NAMES[providerId],
                })}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("providers.confirm_disconnect_desc")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>
                {t("actions.cancel", { ns: "common" })}
              </AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleDisconnect()}>
                {t("providers.disconnect")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-56">
            <Input
              type="password"
              placeholder={t("providers.token_placeholder")}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleConnect();
                }
              }}
              className="w-full pr-8"
              autoComplete="off"
            />
            <span className="absolute inset-y-0 right-2 flex items-center">
              <InfoHint side="left">{t("providers.token_hint")}</InfoHint>
            </span>
          </div>
          <Button
            disabled={!token.trim()}
            loading={submitting}
            onClick={() => void handleConnect()}
          >
            {t("providers.connect")}
          </Button>
        </div>
      )}
    </div>
  );
}

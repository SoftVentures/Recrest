import { useState } from "react";

import { useTranslation } from "react-i18next";

import { PROVIDER_IDS, PROVIDER_NAMES, type ProviderId } from "@recrest/shared";

import { Badge } from "@/components/atoms/Badge";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/atoms/Input";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/molecules/compounds/Dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/molecules/compounds/Tabs";
import { toast } from "@/lib/toast";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setProviderToken } from "@/store/slices/providersSlice";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function ConnectProviderStep({ onBack, onNext }: Props) {
  const { t } = useTranslation("onboarding");
  const [tab, setTab] = useState<ProviderId>(PROVIDER_IDS[0]);

  return (
    <>
      <DialogHeader>
        <DialogTitle>{t("connectProvider.title")}</DialogTitle>
        <DialogDescription>{t("connectProvider.body")}</DialogDescription>
      </DialogHeader>

      <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        {t("connectProvider.local_note")}
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as ProviderId)}>
        <TabsList className="w-full justify-start">
          {PROVIDER_IDS.map((id) => (
            <TabsTrigger key={id} value={id} className="flex-1 sm:flex-none">
              {PROVIDER_NAMES[id]}
            </TabsTrigger>
          ))}
        </TabsList>
        {PROVIDER_IDS.map((id) => (
          <TabsContent key={id} value={id}>
            <ProviderForm providerId={id} />
          </TabsContent>
        ))}
      </Tabs>

      <DialogFooter>
        <Button variant="ghost" onClick={onBack}>
          {t("connectProvider.back")}
        </Button>
        <Button variant="outline" onClick={onNext}>
          {t("connectProvider.skip_and_continue")}
        </Button>
      </DialogFooter>
    </>
  );
}

function ProviderForm({ providerId }: { providerId: ProviderId }) {
  const { t } = useTranslation("onboarding");
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
      toast.success(t("connectProvider.connected", { name: PROVIDER_NAMES[providerId] }));
    } catch {
      toast.error(t("connectProvider.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  if (connected) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border px-3 py-3 text-sm">
        <Badge variant="success" size="sm">
          {t("providers.status_connected", { ns: "settings" })}
        </Badge>
        <span className="text-muted-foreground">
          {connection?.username ?? PROVIDER_NAMES[providerId]}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            void handleConnect();
          }
        }}
        placeholder={t("connectProvider.token_placeholder")}
        className="flex-1"
        autoComplete="off"
      />
      <Button onClick={() => void handleConnect()} disabled={!token.trim()} loading={submitting}>
        {t("connectProvider.connect")}
      </Button>
    </div>
  );
}

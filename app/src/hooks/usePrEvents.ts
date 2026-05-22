import { useEffect, useState } from "react";

import { type PrEvent, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";
import { useAppSelector } from "@/store/hooks";

interface Args {
  repoId?: string;
  days?: number;
}

export function usePrEvents({ repoId, days = 14 }: Args = {}): {
  events: PrEvent[];
  loading: boolean;
} {
  const [events, setEvents] = useState<PrEvent[]>([]);
  const [loading, setLoading] = useState(isTauri());
  const nonce = useAppSelector((s) => s.ui.refreshNonce);

  useEffect(() => {
    if (!isTauri()) {
      setEvents([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    invoke<PrEvent[]>(TauriCommand.LIST_PR_EVENTS, { repoId, days })
      .then((list) => {
        if (!cancelled) setEvents(list);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [repoId, days, nonce]);

  return { events, loading };
}

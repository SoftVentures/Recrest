import { useCallback, useEffect, useState } from "react";

import { type SshKeyListing, TauriCommand } from "@recrest/shared";

import { invoke, isTauri } from "@/lib/tauri";

const EMPTY: SshKeyListing = { dir: null, keys: [] };

/** Loads the private keys detected in the user's `~/.ssh` plus that directory's
 *  absolute path (so a file picker can open there). No-ops outside Tauri. */
export function useSshKeys(): { listing: SshKeyListing; reload: () => void } {
  const [listing, setListing] = useState<SshKeyListing>(EMPTY);

  const reload = useCallback(() => {
    if (!isTauri()) {
      setListing(EMPTY);
      return;
    }
    void invoke<SshKeyListing>(TauriCommand.LIST_SSH_KEYS)
      .then((next) => setListing(next ?? EMPTY))
      .catch(() => setListing(EMPTY));
  }, []);

  useEffect(() => reload(), [reload]);

  return { listing, reload };
}

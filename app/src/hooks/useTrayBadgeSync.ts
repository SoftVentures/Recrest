import { useEffect, useRef } from "react";

import { trayService } from "@/lib/tauri/services/trayService";
import { useAppSelector } from "@/store/hooks";

/** Mirrors the number of open pull/merge requests to the system-tray tooltip.
 *  Only re-fires when the count actually changes, so we don't thrash the tray
 *  icon on every render. */
export function useTrayBadgeSync(): void {
  const prsItems = useAppSelector((s) => s.prs.items);
  const lastRef = useRef<number | null>(null);

  useEffect(() => {
    const count = Object.values(prsItems)
      .flat()
      .filter((p) => p.state === "open").length;
    if (lastRef.current === count) return;
    lastRef.current = count;
    void trayService.updateBadge(count);
  }, [prsItems]);
}

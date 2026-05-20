import type { ReactNode } from "react";

import { Provider } from "react-redux";

import { ConfirmProvider } from "@/components/atoms/ConfirmDialog";
import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import "@/i18n";
import { store } from "@/store";

/** Shared wrapper for Settings-tab tests + stories. Most tabs reach into the
 *  settings slice via `useAppSelector` and expose `<IconButton>`s, which rely
 *  on a TooltipProvider. The DeveloperTab also calls `useConfirm()` for the
 *  factory-reset prompt (Plan §D.3), so we mount `<ConfirmProvider>` here too. */
export function SettingsHarness({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TooltipProvider>
        <ConfirmProvider>{children}</ConfirmProvider>
      </TooltipProvider>
    </Provider>
  );
}

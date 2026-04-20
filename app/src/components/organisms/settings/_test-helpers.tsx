import type { ReactNode } from "react";

import { Provider } from "react-redux";

import { TooltipProvider } from "@/components/molecules/compounds/Tooltip";
import "@/i18n";
import { store } from "@/store";

/** Shared wrapper for Settings-tab tests + stories. Most tabs reach into the
 *  settings slice via `useAppSelector` and expose `<IconButton>`s, which rely
 *  on a TooltipProvider. */
export function SettingsHarness({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <TooltipProvider>{children}</TooltipProvider>
    </Provider>
  );
}

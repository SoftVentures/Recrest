import type { ReactNode } from "react";

import { Provider } from "react-redux";

import { Dialog, DialogContent } from "@/components/molecules/compounds/Dialog";
import "@/i18n";
import { store } from "@/store";

/** Onboarding steps render dialog-primitive children (DialogTitle, DialogHeader,
 *  DialogFooter). Radix's `Dialog.Title` requires a `Dialog.Root` ancestor, so
 *  all step tests + stories share this open-dialog wrapper. The store is always
 *  supplied because several steps (BasicsStep, PickFolderStep, …) dispatch or
 *  read from slices. */
export function OnboardingStepHarness({ children }: { children: ReactNode }) {
  return (
    <Provider store={store}>
      <Dialog open>
        <DialogContent showClose={false} className="max-w-xl sm:max-w-xl">
          {children}
        </DialogContent>
      </Dialog>
    </Provider>
  );
}

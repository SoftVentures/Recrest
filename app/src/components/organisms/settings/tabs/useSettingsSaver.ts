import { useTranslation } from "react-i18next";

import { toast } from "@/lib/toast";
import { useAppDispatch } from "@/store/hooks";
import { saveSettings } from "@/store/slices/settingsSlice";

/**
 * Helper shared by every Settings tab: dispatches `saveSettings` with a
 * patch and surfaces the generic error toast on failure. Kept as a hook so
 * each tab picks up the same i18n-aware error message.
 */
export function useSettingsSaver(): (patch: Record<string, unknown>) => Promise<void> {
  const { t } = useTranslation("errors");
  const dispatch = useAppDispatch();
  return async (patch) => {
    try {
      await dispatch(saveSettings(patch)).unwrap();
    } catch {
      toast.error(t("internal"));
    }
  };
}

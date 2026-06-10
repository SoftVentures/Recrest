import { useEffect } from "react";

import { isTauri } from "@/lib/tauri";
import { syncCustomFontFaces } from "@/lib/utils/customFonts.utils";
import { loadCustomFonts } from "@/store/actions/settings.actions";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

/**
 * Loads user-uploaded fonts on boot and keeps their runtime `@font-face`
 * registrations in sync with the store. Once registered, a `custom:<family>`
 * value selected as the UI or code font resolves to the real typeface.
 *
 * Listing is Tauri-only (the upload picker is too); the registration effect
 * still runs everywhere so the seeded/empty list is a harmless no-op in
 * `dev:web`.
 */
export function useCustomFonts(): void {
  const dispatch = useAppDispatch();
  const customFonts = useAppSelector((s) => s.settings.customFonts);

  useEffect(() => {
    if (!isTauri()) return;
    void dispatch(loadCustomFonts());
  }, [dispatch]);

  useEffect(() => {
    void syncCustomFontFaces(customFonts);
  }, [customFonts]);
}

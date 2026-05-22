import { useEffect, useRef } from "react";

import { useDevice } from "@/hooks/useDevice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { setSidebarCollapsed } from "@/store/reducers/uiReducer";

/**
 * Auto-collapses the sidebar on narrow viewports (mobile/tablet) while
 * remembering the user's manual preference. On wider viewports the hook
 * restores the persisted state instead of staying collapsed.
 */
export function useResponsiveSidebar(): void {
  const device = useDevice();
  const dispatch = useAppDispatch();
  const collapsed = useAppSelector((s) => s.ui.sidebarCollapsed);
  const userPrefRef = useRef(collapsed);
  const forcedRef = useRef(false);

  useEffect(() => {
    const narrow = device.isMobile || device.isTablet;
    if (narrow && !collapsed) {
      userPrefRef.current = collapsed;
      forcedRef.current = true;
      dispatch(setSidebarCollapsed(true));
    } else if (!narrow && forcedRef.current) {
      forcedRef.current = false;
      dispatch(setSidebarCollapsed(userPrefRef.current));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device.isMobile, device.isTablet, dispatch]);
}

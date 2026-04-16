import { useRef, useSyncExternalStore } from "react";

import { createDeviceDetector } from "device-type-detection";

/**
 * Live device-type detection backed by `device-type-detection`.
 * Re-renders on viewport resize so layout hooks (e.g. auto-collapsing the
 * sidebar on narrow widths) react without a page reload.
 */
export function useDevice() {
  const store = useRef<ReturnType<typeof createDeviceDetector> | null>(null);
  if (!store.current) store.current = createDeviceDetector();
  const detector = store.current;

  return useSyncExternalStore(
    (cb) => detector.subscribe(cb),
    () => detector.getState(),
    () => detector.getState(),
  );
}

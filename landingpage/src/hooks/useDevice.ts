import { useRef, useSyncExternalStore } from "react";

import { createDeviceDetector } from "device-type-detection";

/**
 * Live device-type detection backed by `device-type-detection`.
 * Re-renders on viewport resize so responsive hooks (mobile menu, HeroDemo
 * layout) react without a reload. Same hook pattern as `@recrest/app` so
 * the landing stays consistent with the desktop shell.
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

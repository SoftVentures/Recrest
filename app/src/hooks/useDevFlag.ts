import { useAppSelector } from "@/store/hooks";

/**
 * Reads a session-only developer flag with a typed fallback. The hook is
 * intentionally a no-op in production builds — `import.meta.env.DEV` is a
 * **compile-time constant**, so Vite tree-shakes the prod branch down to the
 * return-default line and never emits the `useAppSelector` call. The apparent
 * conditional-hook violation is therefore only a lint-time concern, not a
 * runtime one (each emitted bundle only ever executes one of the two paths).
 */
/* eslint-disable react-hooks/rules-of-hooks -- `import.meta.env.DEV` is a
   compile-time constant; Vite tree-shakes the unused branch so each emitted
   bundle always takes exactly one of the two paths. */
export function useDevFlag<T extends boolean | string>(name: string, defaultValue: T): T {
  if (!import.meta.env.DEV) return defaultValue;
  const value = useAppSelector(
    (s) =>
      (s as unknown as { uiDevFlags?: { flags?: Record<string, boolean | string> } }).uiDevFlags
        ?.flags?.[name],
  );
  return (value ?? defaultValue) as T;
}
/* eslint-enable react-hooks/rules-of-hooks */

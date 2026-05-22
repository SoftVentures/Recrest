import type { EventCallback, UnlistenFn } from "@tauri-apps/api/event";

import { type EventChannelName } from "@/lib/constants/events";
import { listen, safeListen } from "@/lib/tauri";

/**
 * Typed wrapper around {@link listen} that only accepts known channel names
 * from {@link EventChannelName}. Prevents typos in event-name strings —
 * `"repo://statuss"` won't compile.
 */
export function listenChannel<T>(
  channel: EventChannelName,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  return listen<T>(channel, handler);
}

/**
 * Like {@link listenChannel} but never throws — see {@link safeListen}.
 */
export function safeListenChannel<T>(
  channel: EventChannelName,
  handler: EventCallback<T>,
): Promise<UnlistenFn> {
  return safeListen<T>(channel, handler);
}

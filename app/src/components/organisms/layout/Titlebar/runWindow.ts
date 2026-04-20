/**
 * Dynamisch importierte Tauri-Window-API, damit der Web-Bundle den nativen
 * Code nicht zieht. Die Callbacks sind No-ops, wenn die Import-Kette scheitert
 * (z. B. in Jest/Vitest ohne Tauri-Mocks).
 */
export async function runWindow(
  fn: (w: Awaited<ReturnType<typeof getCurrentWindow>>) => Promise<unknown>,
): Promise<void> {
  try {
    const w = await getCurrentWindow();
    await fn(w);
  } catch (err) {
    console.warn("[titlebar]", err);
  }
}

export async function getCurrentWindow() {
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}

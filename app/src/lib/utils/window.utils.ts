/**
 * Dynamically imports the Tauri window API so the web bundle doesn't pull
 * native code. Callback is a no-op when the import chain fails (e.g. plain
 * `dev:web` without the Tauri runtime).
 */
export async function runWindow(
  fn: (w: Awaited<ReturnType<typeof getCurrentWindow>>) => Promise<unknown>,
): Promise<void> {
  try {
    const w = await getCurrentWindow();
    await fn(w);
  } catch (err) {
    console.warn("[window]", err);
  }
}

export async function getCurrentWindow() {
  const { getCurrentWindow: get } = await import("@tauri-apps/api/window");
  return get();
}

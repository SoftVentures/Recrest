import { isTauri } from "@/lib/tauri";

const STORE_FILE = "app-data.json";

async function getStore() {
  if (!isTauri()) return null;
  try {
    const { load } = await import("@tauri-apps/plugin-store");
    return load(STORE_FILE, { autoSave: true, defaults: {} });
  } catch (err) {
    console.warn("[tauri] store load failed:", err);
    return null;
  }
}

export const storageService = {
  async get<T>(key: string): Promise<T | null> {
    const store = await getStore();
    if (!store) return null;
    try {
      const value = await store.get<T>(key);
      return (value ?? null) as T | null;
    } catch {
      return null;
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    const store = await getStore();
    if (!store) return;
    try {
      await store.set(key, value);
      await store.save();
    } catch (err) {
      console.warn(`[tauri] store.set('${key}') failed:`, err);
    }
  },

  async remove(key: string): Promise<void> {
    const store = await getStore();
    if (!store) return;
    try {
      await store.delete(key);
      await store.save();
    } catch {
      /* noop */
    }
  },

  async clear(): Promise<void> {
    const store = await getStore();
    if (!store) return;
    try {
      await store.clear();
      await store.save();
    } catch {
      /* noop */
    }
  },
};

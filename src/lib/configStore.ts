import { PageConfig, pagesConfig as defaultPagesConfig } from "@/config/pages";

const LOCAL_STORAGE_KEY = "whatsapp_bridge_configs_v1";

export async function fetchRemoteConfig(): Promise<Record<string, PageConfig>> {
  // 1. Try remote server fetch first
  try {
    const res = await fetch("/api/config", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.warn("Could not fetch remote config from server:", err);
  }

  // 2. Fallback to localStorage if offline or server fails
  if (typeof window !== "undefined") {
    const local = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (parsed && typeof parsed === "object") {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse localStorage config", e);
      }
    }
  }

  return defaultPagesConfig;
}

export async function saveRemoteConfig(configs: Record<string, PageConfig>): Promise<boolean> {
  // Always save to browser localStorage first
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(configs));
    } catch (err) {
      console.warn("localStorage save error:", err);
    }
  }

  // Attempt API save (may fail silently on read-only serverless hosts like Vercel)
  try {
    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configs),
    });
  } catch (err) {
    console.warn("API config save failed (using localStorage backup):", err);
  }

  // Always return true because localStorage & client state are saved!
  return true;
}

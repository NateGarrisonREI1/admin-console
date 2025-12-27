// src/app/admin/_data/catalogStore.ts

import type { CatalogSystem } from "./mockSystems";

/**
 * Local editable catalog lives in localStorage under this key.
 * This is a "local-first" store for now (supabase later).
 */
export const REI_LOCAL_CATALOG_V1_KEY = "REI_LOCAL_CATALOG_V1";

// Server-safe in-memory fallback (Next/Vercel build + SSR)
let serverMemoryCatalog: CatalogSystem[] | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParseSystems(json: string | null): CatalogSystem[] | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    // supports either { systems: [...] } or [...] (in case you stored raw arrays before)
    const systems = Array.isArray(parsed) ? parsed : parsed?.systems;
    if (!Array.isArray(systems)) return null;
    return systems as CatalogSystem[];
  } catch {
    return null;
  }
}

export function loadLocalCatalogSystems(fallbackSystems: CatalogSystem[]): CatalogSystem[] {
  // Browser: localStorage
  if (isBrowser()) {
    const parsed = safeParseSystems(window.localStorage.getItem(REI_LOCAL_CATALOG_V1_KEY));
    if (parsed && parsed.length) return parsed;

    // seed
    const seeded = fallbackSystems;
    window.localStorage.setItem(
      REI_LOCAL_CATALOG_V1_KEY,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), systems: seeded })
    );
    return seeded;
  }

  // Server: memory fallback
  if (serverMemoryCatalog && serverMemoryCatalog.length) return serverMemoryCatalog;
  serverMemoryCatalog = fallbackSystems;
  return serverMemoryCatalog;
}

export function getCatalogSystemByIdLocal(
  systemId: string,
  fallbackSystems: CatalogSystem[]
): CatalogSystem | null {
  const systems = loadLocalCatalogSystems(fallbackSystems);
  return systems.find((s) => s.id === systemId) || null;
}

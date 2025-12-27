// src/lib/catalog/catalogStore.ts

import type { CatalogSystem, LocalCatalogV1 } from "./catalogTypes";
import { getDefaultLocalCatalogV1 } from "./catalogDefaults";

export const REI_LOCAL_CATALOG_V1_KEY = "REI_LOCAL_CATALOG_V1";

// Server-safe in-memory fallback so imports don’t crash in Next.js server contexts.
let serverMemoryCatalog: LocalCatalogV1 | null = null;

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(json: string | null): LocalCatalogV1 | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json);
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.systems)) return null;
    return parsed as LocalCatalogV1;
  } catch {
    return null;
  }
}

export function loadLocalCatalog(): LocalCatalogV1 {
  // Browser: use localStorage
  if (isBrowser()) {
    const parsed = safeParse(window.localStorage.getItem(REI_LOCAL_CATALOG_V1_KEY));
    if (parsed && parsed.systems.length) return parsed;

    const seeded = getDefaultLocalCatalogV1();
    window.localStorage.setItem(REI_LOCAL_CATALOG_V1_KEY, JSON.stringify(seeded));
    return seeded;
  }

  // Server: use memory fallback
  if (serverMemoryCatalog && serverMemoryCatalog.systems.length) return serverMemoryCatalog;

  serverMemoryCatalog = getDefaultLocalCatalogV1();
  return serverMemoryCatalog;
}

export function saveLocalCatalog(next: LocalCatalogV1): void {
  const normalized: LocalCatalogV1 = {
    version: 1,
    updatedAt: new Date().toISOString(),
    systems: Array.isArray(next.systems) ? next.systems : [],
  };

  if (isBrowser()) {
    window.localStorage.setItem(REI_LOCAL_CATALOG_V1_KEY, JSON.stringify(normalized));
  } else {
    serverMemoryCatalog = normalized;
  }
}

export function getCatalogSystemById(systemId: string): CatalogSystem | null {
  const catalog = loadLocalCatalog();
  return catalog.systems.find((s) => s.id === systemId) || null;
}

export function listCatalogSystems(): CatalogSystem[] {
  return loadLocalCatalog().systems;
}

export function upsertCatalogSystem(system: CatalogSystem): LocalCatalogV1 {
  const catalog = loadLocalCatalog();
  const idx = catalog.systems.findIndex((s) => s.id === system.id);

  const systems = [...catalog.systems];
  if (idx >= 0) systems[idx] = system;
  else systems.unshift(system);

  const next: LocalCatalogV1 = { ...catalog, systems, updatedAt: new Date().toISOString() };
  saveLocalCatalog(next);
  return next;
}

export function deleteCatalogSystem(systemId: string): LocalCatalogV1 {
  const catalog = loadLocalCatalog();
  const systems = catalog.systems.filter((s) => s.id !== systemId);

  const next: LocalCatalogV1 = { ...catalog, systems, updatedAt: new Date().toISOString() };
  saveLocalCatalog(next);
  return next;
}

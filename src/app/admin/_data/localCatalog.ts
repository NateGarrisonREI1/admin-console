export type LeafTierKey = "good" | "better" | "best";

export type CatalogTierConfig = {
  enabled: boolean;
  installCostMin?: number;
  installCostMax?: number;
  efficiencyScore?: number; // optional, used later
};

export type CatalogSystem = {
  id: string;
  category: string;
  name: string;
  highlights: string[];
  tags?: string[];

  /** ✅ Option A: incentives attached by ID */
  incentiveIds?: string[];

  /** ✅ Option A: tier config lives in the catalog system */
  tiers?: Partial<Record<LeafTierKey, CatalogTierConfig>>;

  /** legacy */
  defaultAssumptions?: {
    estCost?: number;
    estAnnualSavings?: number;
    estPaybackYears?: number;
  };

  leafSSOverrides?: any;
  photos?: string[];
};

const STORAGE_KEY = "REI_LOCAL_CATALOG_V2";
const LEGACY_KEYS = ["LEAF_LOCAL_CATALOG"];

/** migrate legacy key → new key (one-way) */
function migrateIfNeeded() {
  if (typeof window === "undefined") return;

  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return; // already migrated / already in use

    for (const k of LEGACY_KEYS) {
      const raw = localStorage.getItem(k);
      if (raw) {
        localStorage.setItem(STORAGE_KEY, raw);
        // optional: leave legacy intact, or remove it
        // localStorage.removeItem(k);
        return;
      }
    }
  } catch {
    // ignore
  }
}

export function loadLocalCatalog(): CatalogSystem[] {
  if (typeof window === "undefined") return [];
  migrateIfNeeded();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveLocalCatalog(list: CatalogSystem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertCatalogSystem(sys: CatalogSystem) {
  const list = loadLocalCatalog();
  const idx = list.findIndex((s) => s.id === sys.id);
  if (idx >= 0) list[idx] = sys;
  else list.unshift(sys);
  saveLocalCatalog(list);
}

export function deleteCatalogSystem(id: string) {
  const list = loadLocalCatalog().filter((s) => s.id !== id);
  saveLocalCatalog(list);
}

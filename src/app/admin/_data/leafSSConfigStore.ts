import { LEAF_SS_CONFIG } from "./leafSSConfig";

/**
 * Where the admin UI saves the edited config.
 * (localStorage for now, DB later)
 */
const STORAGE_KEY = "LEAF_SS_MASTER_CONFIG";

/**
 * Load the master config, falling back to compiled defaults
 */
export function loadLeafSSMasterConfig() {
  if (typeof window === "undefined") {
    return LEAF_SS_CONFIG;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return LEAF_SS_CONFIG;

    const parsed = JSON.parse(raw);
    return {
      ...LEAF_SS_CONFIG,
      ...parsed,
    };
  } catch {
    return LEAF_SS_CONFIG;
  }
}

/**
 * Save from admin editor
 */
export function saveLeafSSMasterConfig(config: any) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

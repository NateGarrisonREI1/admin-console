/**
 * LEAF SS Config Runtime Layer (v1)
 *
 * This file currently acts as a read-only pass-through
 * to the master LEAF_SS_CONFIG.
 *
 * Runtime overrides are intentionally disabled until
 * baseline calculations are fully implemented.
 */

import LEAF_SS_CONFIG from "./leafSSConfig";

export function getLeafSSRuntimeConfig() {
  return LEAF_SS_CONFIG;
}

export default getLeafSSRuntimeConfig;

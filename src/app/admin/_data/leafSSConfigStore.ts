/**
 * LEAF System Snapshot Config Store
 *
 * This store is a thin access layer around the master
 * LEAF_SS_CONFIG. It does NOT define assumptions.
 *
 * The application must work even if this store is removed.
 */

import { create } from "zustand";
import LEAF_SS_CONFIG from "./leafSSConfig";

type LeafSSConfigState = {
  config: typeof LEAF_SS_CONFIG;
};

export const useLeafSSConfigStore = create<LeafSSConfigState>(() => ({
  config: LEAF_SS_CONFIG
}));

export default useLeafSSConfigStore;

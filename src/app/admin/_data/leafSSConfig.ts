/**
 * LEAF System Snapshot – Master Assumptions Config (v1)
 *
 * This file is the single source of truth for all global
 * assumptions used in LEAF system calculations.
 *
 * ❗ Rules:
 * - No UI state
 * - No user-entered values
 * - No snapshot-specific logic
 * - Only assumptions that affect calculations
 */

export const LEAF_SS_CONFIG = {
  /* ======================================================
   * META / VERSIONING
   * ====================================================== */
  meta: {
    version: "1.0.0",
    lastUpdated: "2025-01-01",
    notes: "Clean rebuild: baseline utility allocation, lifecycle, carbon factors"
  },

  /* ======================================================
   * UTILITY ALLOCATION (FOUNDATIONAL)
   * Defines what share of each utility is attributed
   * to an existing system type / subtype.
   * ====================================================== */
  utilityAllocation: {
    /**
     * Fallback if a system type is missing configuration.
     * This should almost never be used.
     */
    globalDefault: {
      electricity: 1.0
    },

    /**
     * System-type + subtype overrides.
     * Key format: "SYSTEM_TYPE:SUBTYPE"
     */
    systemTypeOverrides: {
      /* ---------------- HVAC ---------------- */
      "HVAC:Gas Furnace": {
        electricity: 0.25,
        naturalGas: 0.75
      },

      "HVAC:Heat Pump": {
        electricity: 0.9
      },

      "HVAC:Dual Fuel": {
        electricity: 0.5,
        naturalGas: 0.5
      },

      "HVAC:Oil Furnace": {
        electricity: 0.2,
        fuelOil: 0.8
      },

      "HVAC:Mini Split": {
        electricity: 1.0
      },

      /* -------------- WATER HEATER -------------- */
      "WATER_HEATER:Gas Tank": {
        naturalGas: 0.8
      },

      "WATER_HEATER:Gas Tankless": {
        naturalGas: 0.85
      },

      "WATER_HEATER:Electric Tank": {
        electricity: 1.0
      },

      "WATER_HEATER:Heat Pump": {
        electricity: 1.0
      },

      /* ---------------- LIGHTING ---------------- */
      "LIGHTING:All": {
        electricity: 0.18
      },

      /* ---------------- APPLIANCES ---------------- */
      "APPLIANCES:Cooking": {
        electricity: 0.75,
        naturalGas: 0.25
      },

      "APPLIANCES:Laundry": {
        electricity: 1.0
      },

      "APPLIANCES:Refrigeration": {
        electricity: 1.0
      }
    }
  },

  /* ======================================================
   * LIFECYCLE THRESHOLDS
   * Used to classify existing system condition
   * ====================================================== */
  lifecycle: {
    earlyLife: {
      maxAgeYears: 5,
      maxWearScore: 2
    },

    midLife: {
      maxAgeYears: 12,
      maxWearScore: 3
    },

    nearEndOfLife: {
      minAgeYears: 15,
      minWearScore: 4
    }
  },

  /* ======================================================
   * CARBON FACTORS
   * Approximate lbs CO₂ per unit of energy
   * ====================================================== */
  carbonFactors: {
    electricity: {
      unit: "kWh",
      lbsCO2PerUnit: 0.85
    },
    naturalGas: {
      unit: "therm",
      lbsCO2PerUnit: 11.7
    },
    propane: {
      unit: "gallon",
      lbsCO2PerUnit: 12.7
    },
    fuelOil: {
      unit: "gallon",
      lbsCO2PerUnit: 22.4
    }
  }
};

export default LEAF_SS_CONFIG;


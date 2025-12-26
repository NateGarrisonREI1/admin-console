export type CatalogSystem = {
  id: string;
  category: "HVAC" | "Water Heater" | "Windows" | "Doors" | "Lighting" | "Insulation" | "Other";
  name: string;
  highlights: string[];

  /**
   * ✅ Tags used for matching incentives to suggested upgrades.
   * Keep these simple + consistent (lowercase, snake_case recommended).
   * Examples:
   *  - ["hvac","heat_pump","ducted"]
   *  - ["water_heater","hpwh"]
   */
  tags: string[];

  defaultAssumptions: {
    estCost?: number; // later we can split equipment vs labor
    estAnnualSavings?: number;
    estPaybackYears?: number;
  };
};

export const MOCK_SYSTEMS: CatalogSystem[] = [
  {
    id: "sys_hvac_hp_ducted",
    category: "HVAC",
    name: "Ducted Heat Pump (High Efficiency)",
    highlights: ["Replaces gas furnace + AC", "Better comfort", "Lower CO₂"],
    tags: ["hvac", "heat_pump", "ducted"],
    defaultAssumptions: { estCost: 14000, estAnnualSavings: 900, estPaybackYears: 12 },
  },
  {
    id: "sys_hvac_gas_furnace_high",
    category: "HVAC",
    name: "High-Efficiency Gas Furnace (95%+ AFUE)",
    highlights: ["Lower gas usage", "Good for existing ductwork"],
    tags: ["hvac", "gas_furnace", "high_efficiency"],
    defaultAssumptions: { estCost: 8500, estAnnualSavings: 450, estPaybackYears: 10 },
  },
  {
    id: "sys_wh_hp",
    category: "Water Heater",
    name: "Heat Pump Water Heater",
    highlights: ["Big electric savings", "Often qualifies for rebates"],
    tags: ["water_heater", "heat_pump", "hpwh"],
    defaultAssumptions: { estCost: 2800, estAnnualSavings: 250, estPaybackYears: 8 },
  },
  {
    id: "sys_windows_double_lowE",
    category: "Windows",
    name: "Double Pane Low-E Retrofit Windows",
    highlights: ["Comfort upgrade", "Lower drafts"],
    tags: ["windows", "double_pane", "low_e"],
    defaultAssumptions: { estCost: 12000, estAnnualSavings: 350, estPaybackYears: 20 },
  },
];

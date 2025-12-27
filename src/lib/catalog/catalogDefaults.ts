// src/lib/catalog/catalogDefaults.ts

import type { LocalCatalogV1 } from "./catalogTypes";

export function getDefaultLocalCatalogV1(): LocalCatalogV1 {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    systems: [
      {
        id: "sys_hvac_hp_ducted",
        category: "HVAC",
        name: "Ducted Heat Pump (High Efficiency)",
        highlights: ["Replaces gas furnace + AC", "Better comfort", "Lower CO₂"],
        defaultAssumptions: { estCost: 14000, estAnnualSavings: 900, estPaybackYears: 12 },
        tags: ["HVAC", "HeatPump", "Ducted"],
        incentives: [
          {
            id: "inc_fed_hp_taxcredit",
            name: "Federal Tax Credit (Heat Pump)",
            amount: 2000,
            scope: { type: "federal" },
            systemIds: ["sys_hvac_hp_ducted"],
            notes: "Example placeholder (edit per your rules).",
          },
          {
            id: "inc_or_hp_rebate",
            name: "Oregon Heat Pump Rebate (Example)",
            amount: 1200,
            scope: { type: "state", states: ["OR"] },
            systemTags: ["HeatPump"],
          },
          {
            id: "inc_97123_utility_hp",
            name: "Local Utility Rebate (97123 Example)",
            amount: 500,
            scope: { type: "zip", zips: ["97123"] },
            systemTags: ["HeatPump"],
          },
        ],
      },
    ],
  };
}

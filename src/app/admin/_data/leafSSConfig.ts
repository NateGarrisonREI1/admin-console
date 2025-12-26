export const LEAF_SS_CONFIG = {
  "leafSSConfigSchemaVersion": "1.0.0",
  "notes": [
    "This config is designed so EVERY displayed value/copy block can be changed from intake/admin without editing UI code.",
    "Developer: treat this as the single source of truth. UI reads from this JSON and renders accordingly.",
    "All money values are numbers (USD). All carbon values are numbers (lbs/yr). Percent reductions are decimals (0.35 = 35%).",
    "The UI should never hardcode strings like 'Looks good ✅' or ranges like '$5,000–$7,000'—they come from this config."
  ],

  "global": {
    "leafBrandColorHex": "#43a419",

    "slider": {
      "min": 3000,
      "max": 15000,
      "step": 100,
      "defaultBehavior": {
        "onTierChangeSetPriceTo": "tierMidpoint"
      }
    },

    "format": {
      "currencyLocale": "en-US",
      "currency": "USD",
      "rangeDash": "–",
      "moneyPrefix": "$",
      "carbonUnit": "lbs/yr",
      "savingsUnitMonthly": "/mo",
      "savingsUnitYearly": "/yr"
    },

    "incentives": {
      "low": 750,
      "high": 3000,
      "labels": {
        "sectionTitle": "🏷️ Incentives & rebates",
        "summaryTypical": "$750–$3,000+ typical",
        "summarySub": "Federal • State • Utility",
        "federalTitle": "🇺🇸 Federal",
        "stateTitle": "🏛️ State",
        "localTitle": "⚡ Local / Utility",
        "linksTitle": "🔗 Helpful links",
        "disclaimer": "LEAF identifies likely incentives based on system type and location. Contractors confirm eligibility, pricing, and paperwork requirements."
      },
      "cards": {
        "federal": {
          "body": "Tax credit example: 20–30% up to $600–$2,000",
          "footnote": "Claimed by homeowner when filing taxes."
        },
        "state": {
          "body": "Program rebates often $500–$1,500 (varies by state & funding)",
          "footnote": "Eligibility can depend on equipment + participating contractors."
        },
        "local": {
          "body": "Flat rebates typically $250–$750",
          "footnote": "Often applied at install or submitted after completion."
        }
      },
      "links": [
        { "label": "IRS Form 5695 (PDF)", "url": "https://www.irs.gov/pub/irs-pdf/f5695.pdf" },
        { "label": "ENERGY STAR Rebate Finder", "url": "https://www.energystar.gov/rebate-finder" }
      ]
    },

    "rangesAndClassifications": {
      "costClassThresholds": {
        "unrealLowOffsetFromMin": -500,
        "overpricedOffsetFromMax": 3000
      },

      "dynamicSavingsRule": {
        "type": "stepBumpAboveTierMax",
        "stepSizeDollars": 1000,
        "bumpPerStepMonthlyDollars": 2,
        "note": "Savings increases slightly with price ABOVE tier max. This is a heuristic and should be editable per snapshot if desired."
      }
    },

    "uiText": {
      "headerTitle": "LEAF System Snapshot",
      "headerPageLabelTemplate": "Snapshot {current} of {total}",

      "heroHelper": "LEAF provides ranges so you can evaluate contractor quotes with confidence.",
      "heroNote": "Note: higher-priced systems can increase savings slightly — but ROI can drop if the added cost doesn’t pay back over time.",

      "sections": {
        "currentTitle": "📷 Current system",
        "recommendedTitle": "✨ Recommended upgrade",
        "rangeDetailsTitle": "💰 Cost & savings range",
        "rangeDetailsTap": "Tap for details",
        "testQuoteTitle": "🎚️ Test your quote",
        "testQuoteHelper": "Slide the price. Savings bumps slightly with higher system cost — but ROI can drop if price rises faster than savings.",
        "quickReadTitle": "Quick read",
        "quickReadExpand": "Why this message + more questions",
        "quickReadWhyTitle": "Why LEAF is saying this",
        "quickReadMoreQuestionsTitle": "More questions (optional)",
        "decisionTitle": "🧠 Does this decision make sense?"
      },

      "buttons": {
        "reset": "Reset",
        "ctaPrimary": "🔎 Get an exact bid from a contractor"
      },

      "ctaFooterText": "Compare the quote against your LEAF range"
    }
  },

  "messageLibrary": {
    "costBadgeTextByClass": {
      "unreal_low": "Unrealistic",
      "low": "Low (verify scope)",
      "in": "Within range",
      "likely_over": "Likely overpriced",
      "over": "Overpriced"
    },

    "overallBadgeTextByClass": {
      "over": "Major caution 🚩",
      "in": "Looks good ✅",
      "unreal_low": "Proceed smart ⚠️",
      "low": "Proceed smart ⚠️",
      "likely_over": "Proceed smart ⚠️"
    },

    "quickReadByCostClass": {
      "unreal_low": {
        "headline": "This price is extremely low — verify scope before scheduling.",
        "why": [
          "Very low pricing often means partial scope or missing line items.",
          "Confirming scope protects you from surprise add-ons later."
        ],
        "qVisible": [
          "Is this a full replacement quote (equipment, labor, permits, startup/commissioning)?",
          "What’s excluded that could be added later (venting, thermostat, disposal, permits)?"
        ],
        "qMore": [
          "Can you itemize model numbers + warranty terms in writing?",
          "Is there any scenario where price changes after work begins?"
        ]
      },

      "low": {
        "headline": "Competitive quote — great sign if scope is complete.",
        "why": [
          "Competitive bids happen and can be a win for the homeowner.",
          "A quick scope check ensures it’s apples-to-apples."
        ],
        "qVisible": [
          "Can you walk me through exactly what’s included in this price?",
          "Are permits/inspections and commissioning included?"
        ],
        "qMore": [
          "Is the thermostat included? What about haul-away/disposal?",
          "Can you confirm final scope and model numbers in writing?"
        ]
      },

      "in": {
        "headline": "This looks like a fair, in-range quote.",
        "why": [
          "Pricing aligns with what LEAF typically sees for this replacement category.",
          "In-range quotes usually indicate predictable scope and fewer surprises."
        ],
        "qVisible": [
          "What’s the install timeline and what prep do you need from me?",
          "What warranty coverage comes with the equipment and labor?"
        ],
        "qMore": [
          "Do you handle permits and inspection sign-off?",
          "What maintenance keeps performance strong long-term?"
        ]
      },

      "likely_over": {
        "headline": "Higher than LEAF range — confirm what’s driving the price.",
        "why": [
          "Higher quotes can be justified by site conditions (access, venting, ductwork, electrical).",
          "It can also reflect premium add-ons you may not need.",
          "More expensive systems can provide slightly higher savings (better efficiency/controls/commissioning) — usually incremental.",
          "ROI can drop when cost climbs faster than savings. A premium quote should come with clear, measurable value."
        ],
        "qVisible": [
          "What specifically is driving the price above typical range?",
          "Is there a simpler option that still meets the goals?"
        ],
        "qMore": [
          "Can you provide an itemized quote so I can compare bids accurately?",
          "Which add-ons are optional vs required?"
        ]
      },

      "over": {
        "headline": "Major caution — this looks overpriced for the category.",
        "why": [
          "This is significantly above typical replacement pricing.",
          "Before committing, compare at least one more itemized bid.",
          "More expensive systems can provide slightly higher savings (better efficiency/controls/commissioning) — usually incremental.",
          "ROI can drop when cost climbs faster than savings. A premium quote should come with clear, measurable value."
        ],
        "qVisible": [
          "Can you itemize the quote (equipment, labor, permits, extras) line-by-line?",
          "What would the ‘standard replacement’ option cost and what changes?"
        ],
        "qMore": [
          "Are there scope items here that belong in a separate project (duct redesign, electrical upgrades)?",
          "Can you confirm model numbers and efficiency details to justify pricing?"
        ]
      }
    },

    "decisionByCostClass": {
      "in": {
        "decisionBadge": "Likely yes ✅",
        "summaryHeadline": "This looks financially reasonable.",
        "summaryText": "If the contractor quote lands within the LEAF range, this is typically a strong replacement decision.",
        "msValueCheck": "Within range ✅",
        "msMeaning": "Quotes in-range usually indicate predictable scope + fair pricing."
      },

      "over": {
        "decisionBadge": "Unclear 🚩",
        "summaryHeadline": "This needs a closer look.",
        "summaryText": "The quote is well above typical range. Request an itemized scope and compare at least one more bid.",
        "msValueCheck": "Far above range 🚩",
        "msMeaning": "This is likely overpriced. Compare another itemized bid before committing."
      },

      "unreal_low": {
        "decisionBadge": "Likely yes (with clarity) ⚠️",
        "summaryHeadline": "This can still make sense — confirm a few details.",
        "summaryText": "Use the questions above to confirm scope and what’s driving price. Premium cost can bump savings slightly, but ROI often drops if price rises too fast.",
        "msValueCheck": "Very low 🚩",
        "msMeaning": "High chance something is missing. Get scope in writing before scheduling."
      },

      "low": {
        "decisionBadge": "Likely yes (with clarity) ⚠️",
        "summaryHeadline": "This can still make sense — confirm a few details.",
        "summaryText": "Use the questions above to confirm scope and what’s driving price. Premium cost can bump savings slightly, but ROI often drops if price rises too fast.",
        "msValueCheck": "Below range ⚠️",
        "msMeaning": "Could be a great deal — just confirm it’s a full scope replacement quote."
      },

      "likely_over": {
        "decisionBadge": "Likely yes (with clarity) ⚠️",
        "summaryHeadline": "This can still make sense — confirm a few details.",
        "summaryText": "Use the questions above to confirm scope and what’s driving price. Premium cost can bump savings slightly, but ROI often drops if price rises too fast.",
        "msValueCheck": "Above range ⚠️",
        "msMeaning": "Premium cost can bump savings slightly, but ROI may drop. Ask what justifies the cost."
      }
    }
  },

  "snapshots": [
    {
      "snapshotId": "snapshot_1",
      "pageOrder": 0,

      "hero": {
        "title": "🔥 HVAC • Gas Furnace",
        "subtitle": "Direct-replacement gas furnace upgrade"
      },

      "currentSystemCard": {
        "statusPillText": "Near end of life",
        "titleText": "Existing gas furnace",
        "annualCostRange": { "min": 350, "max": 450 },
        "carbonRange": { "min": 3400, "max": 4000 },
        "photoUrl": "old-furnace.png"
      },

      "recommendedSystemCard": {
        "statusPillTextByTier": {
          "good": "Standard efficiency",
          "better": "High efficiency",
          "best": "Best available"
        },
        "photoUrlByTier": {
          "good": "new-furnace-good.png",
          "better": "new-furnace.png",
          "best": "new-furnace-best.png"
        },
        "recommendedNameByTier": {
          "good": "Standard-efficiency gas furnace",
          "better": "High-efficiency gas furnace",
          "best": "Ultra high-efficiency gas furnace"
        }
      },

      "goodBetterBest": {
        "enabled": true,
        "uiLabel": "Choose package",
        "options": [
          { "key": "good", "label": "Good" },
          { "key": "better", "label": "Better" },
          { "key": "best", "label": "Best" }
        ]
      },

      "tiers": {
        "good": {
          "leafPriceRange": { "min": 4500, "max": 6000 },
          "baseMonthlySavings": { "min": 15, "max": 25 },
          "carbonReduction": { "min": 0.25, "max": 0.35 }
        },
        "better": {
          "leafPriceRange": { "min": 5000, "max": 7000 },
          "baseMonthlySavings": { "min": 19, "max": 35 },
          "carbonReduction": { "min": 0.30, "max": 0.45 }
        },
        "best": {
          "leafPriceRange": { "min": 6500, "max": 9500 },
          "baseMonthlySavings": { "min": 28, "max": 48 },
          "carbonReduction": { "min": 0.45, "max": 0.60 }
        }
      },

      "rulesOverrides": {
        "dynamicSavingsRule": {
          "type": "stepBumpAboveTierMax",
          "stepSizeDollars": 1000,
          "bumpPerStepMonthlyDollars": 2
        },
        "costClassThresholds": {
          "unrealLowOffsetFromMin": -500,
          "overpricedOffsetFromMax": 3000
        }
      }
    },

    {
      "snapshotId": "snapshot_2",
      "pageOrder": 1,

      "hero": {
        "title": "💧 Water Heater • Gas Tank",
        "subtitle": "High-efficiency replacement water heater"
      },

      "currentSystemCard": {
        "statusPillText": "Aging",
        "titleText": "Existing gas tank water heater",
        "annualCostRange": { "min": 280, "max": 420 },
        "carbonRange": { "min": 2200, "max": 3200 },
        "photoUrl": "old-waterheater.png"
      },

      "recommendedSystemCard": {
        "statusPillTextByTier": {
          "good": "Standard efficiency",
          "better": "High efficiency",
          "best": "Lowest CO₂"
        },
        "photoUrlByTier": {
          "good": "new-waterheater-good.png",
          "better": "new-waterheater-better.png",
          "best": "new-waterheater-best.png"
        },
        "recommendedNameByTier": {
          "good": "Standard gas tank water heater",
          "better": "High-efficiency gas tank water heater",
          "best": "Heat pump water heater"
        }
      },

      "goodBetterBest": {
        "enabled": true,
        "uiLabel": "Choose package",
        "options": [
          { "key": "good", "label": "Good" },
          { "key": "better", "label": "Better" },
          { "key": "best", "label": "Best" }
        ]
      },

      "tiers": {
        "good": {
          "leafPriceRange": { "min": 1800, "max": 3200 },
          "baseMonthlySavings": { "min": 6, "max": 10 },
          "carbonReduction": { "min": 0.10, "max": 0.20 }
        },
        "better": {
          "leafPriceRange": { "min": 2500, "max": 4500 },
          "baseMonthlySavings": { "min": 8, "max": 14 },
          "carbonReduction": { "min": 0.18, "max": 0.30 }
        },
        "best": {
          "leafPriceRange": { "min": 3800, "max": 6500 },
          "baseMonthlySavings": { "min": 14, "max": 24 },
          "carbonReduction": { "min": 0.35, "max": 0.55 }
        }
      },

      "rulesOverrides": {}
    },

    {
      "snapshotId": "snapshot_3",
      "pageOrder": 2,

      "hero": {
        "title": "🪟 Windows • Mixed",
        "subtitle": "Upgrade to high-performance windows"
      },

      "currentSystemCard": {
        "statusPillText": "Leaky",
        "titleText": "Existing mixed windows",
        "annualCostRange": { "min": 240, "max": 520 },
        "carbonRange": { "min": 900, "max": 1800 },
        "photoUrl": "old-windows.png"
      },

      "recommendedSystemCard": {
        "statusPillTextByTier": {
          "good": "Basic upgrade",
          "better": "High performance",
          "best": "Best comfort"
        },
        "photoUrlByTier": {
          "good": "new-windows-good.png",
          "better": "new-windows-better.png",
          "best": "new-windows-best.png"
        },
        "recommendedNameByTier": {
          "good": "Mid-grade window package",
          "better": "High-performance window package",
          "best": "Premium triple-pane package"
        }
      },

      "goodBetterBest": {
        "enabled": true,
        "uiLabel": "Choose package",
        "options": [
          { "key": "good", "label": "Good" },
          { "key": "better", "label": "Better" },
          { "key": "best", "label": "Best" }
        ]
      },

      "tiers": {
        "good": {
          "leafPriceRange": { "min": 9000, "max": 14000 },
          "baseMonthlySavings": { "min": 8, "max": 16 },
          "carbonReduction": { "min": 0.10, "max": 0.20 }
        },
        "better": {
          "leafPriceRange": { "min": 12000, "max": 18000 },
          "baseMonthlySavings": { "min": 12, "max": 22 },
          "carbonReduction": { "min": 0.15, "max": 0.28 }
        },
        "best": {
          "leafPriceRange": { "min": 16000, "max": 26000 },
          "baseMonthlySavings": { "min": 18, "max": 32 },
          "carbonReduction": { "min": 0.22, "max": 0.40 }
        }
      },

      "rulesOverrides": {}
    }
  ],

  "developerIntegrationChecklist": {
    "intakeFieldsToExpose": [
      "Global: slider.min, slider.max, slider.step",
      "Global: incentives.low, incentives.high",
      "Global: costClassThresholds (unrealLowOffsetFromMin, overpricedOffsetFromMax)",
      "Global or per snapshot: dynamicSavingsRule (stepSizeDollars, bumpPerStepMonthlyDollars)",
      "Message library: costBadgeTextByClass",
      "Message library: overallBadgeTextByClass",
      "Message library: quickReadByCostClass (headline, why[], qVisible[], qMore[])",
      "Message library: decisionByCostClass (decisionBadge, summaryHeadline, summaryText, msValueCheck, msMeaning)",
      "Per snapshot: hero.title, hero.subtitle",
      "Per snapshot: currentSystemCard (statusPillText, titleText, annualCostRange min/max, carbonRange min/max, photoUrl)",
      "Per snapshot: recommendedSystemCard (statusPillTextByTier, photoUrlByTier, recommendedNameByTier)",
      "Per snapshot: tiers.good|better|best leafPriceRange min/max",
      "Per snapshot: tiers.good|better|best baseMonthlySavings min/max",
      "Per snapshot: tiers.good|better|best carbonReduction min/max",
      "Per snapshot: goodBetterBest UI labels (enabled, uiLabel, option labels)"
    ],

    "renderingLogicNotes": [
      "Tier selection controls leafPriceRange, baseMonthlySavings, carbonReduction, recommendedName, recommended photo, and recommended status pill.",
      "Existing carbon is taken from currentSystemCard.carbonRange. Proposed carbon is computed from existing carbon * (1 - reduction).",
      "Yearly savings is computed from monthly savings * 12 (both base range and dynamic range at current price).",
      "Dynamic savings uses baseMonthlySavings and adds bump steps when price > tier.max.",
      "All messages in quick read and decision blocks use messageLibrary + costClass.",
      "Green range band positions use the CURRENT tier leafPriceRange mapped into slider min/max percent space."
    ]
  }
} as const;

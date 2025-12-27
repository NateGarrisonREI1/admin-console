"use client";

// ✅ relative import (no @ alias)
import type { IncentiveResource } from "../../../lib/incentives/incentiveRules";

const LS_KEY = "rei.incentives.overrides.v1";

export function loadLocalIncentiveOverrides(): IncentiveResource[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IncentiveResource[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalIncentiveOverrides(items: IncentiveResource[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LS_KEY, JSON.stringify(items ?? []));
}

export function clearLocalIncentiveOverrides() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LS_KEY);
}

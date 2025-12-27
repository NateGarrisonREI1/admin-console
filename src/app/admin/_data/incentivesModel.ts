export type IncentiveLevel = "federal" | "state" | "local";

export type Incentive = {
  id: string;
  title: string;
  level: IncentiveLevel;

  amount?: number;
  valueText?: string;

  url?: string;
  notes?: string;

  appliesTo?: {
    states?: string[];
    zips?: string[];
  };

  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = "REI_INCENTIVES_LIBRARY_V1";

export function loadIncentives(): Incentive[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveIncentives(list: Incentive[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function upsertIncentive(item: Incentive) {
  const list = loadIncentives();
  const idx = list.findIndex((i) => i.id === item.id);

  const now = new Date().toISOString();
  const next = {
    ...item,
    updatedAt: now,
    createdAt: item.createdAt || now,
  };

  if (idx >= 0) {
    list[idx] = next;
  } else {
    list.unshift(next);
  }

  saveIncentives(list);
}

export function deleteIncentive(id: string) {
  saveIncentives(loadIncentives().filter((i) => i.id !== id));
}

// src/app/admin/_data/localJobs.ts

export type ExistingSystem = {
  id: string;
  type: string;
  subtype: string;
  ageYears: number;
  operational: "Yes" | "No";
  wear: 1 | 2 | 3 | 4 | 5;
  maintenance: "Good" | "Average" | "Poor";
};

export type Job = {
  id: string;
  reportId?: string;
  customerName?: string;
  address?: string;
  sqft?: number;
  yearBuilt?: number;
  createdAt?: string;

  // incentives / geo
  zip?: string;
  state?: string;

  systems?: ExistingSystem[];
};

const KEY = "rei_local_jobs_v1";

/* =======================
   Load / Save
======================= */

export function loadLocalJobs(): Job[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Job[]) : [];
  } catch {
    return [];
  }
}

export function saveLocalJobs(jobs: Job[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(jobs));
}

/* =======================
   CRUD helpers
======================= */

export function upsertLocalJob(job: Job) {
  const existing = loadLocalJobs();
  const idx = existing.findIndex((j) => j.id === job.id);

  const next =
    idx >= 0
      ? [...existing.slice(0, idx), job, ...existing.slice(idx + 1)]
      : [job, ...existing];

  saveLocalJobs(next);
}

export function findLocalJob(jobId: string): Job | null {
  const jobs = loadLocalJobs();
  return jobs.find((j) => j.id === jobId) ?? null;
}

export function updateLocalJob(job: Job) {
  upsertLocalJob(job);
}

export function deleteLocalJob(jobId: string) {
  const jobs = loadLocalJobs();
  saveLocalJobs(jobs.filter((j) => j.id !== jobId));
}

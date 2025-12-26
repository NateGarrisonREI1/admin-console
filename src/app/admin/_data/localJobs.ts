import type { Job } from "./mockJobs";

const KEY = "rei_mock_jobs_v1";

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

export function upsertLocalJob(job: Job) {
  const existing = loadLocalJobs();
  const idx = existing.findIndex((j) => j.id === job.id);
  const next = idx >= 0 ? [...existing.slice(0, idx), job, ...existing.slice(idx + 1)] : [job, ...existing];
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
  const next = jobs.filter((j) => j.id !== jobId);
  saveLocalJobs(next);
}

// src/app/admin/jobs/[id]/_lib/workflow.ts

export type ResponseStatusKey =
  | "unreviewed"
  | "needs_review"
  | "blocked"
  | "waiting_on_broker"
  | "in_progress"
  | "ready"
  | "delivered"
  | "closed"
  | string;

/**
 * Canonical display labels for response_status.
 * This is the single source of truth for UI wording.
 */
export function prettyResponseStatus(raw?: string | null) {
  const v = String(raw ?? "").trim().toLowerCase();

  // legacy aliases → canonical-ish display
  if (!v) return "New";
  if (v === "waiting" || v === "awaiting_broker" || v === "pending") return "Waiting on broker";
  if (v === "ready_to_send") return "Ready to send";
  if (v === "working") return "In progress";
  if (v === "sent") return "Delivered";

  if (v === "unreviewed") return "New";
  if (v === "needs_review") return "Needs review";
  if (v === "blocked") return "Blocked";
  if (v === "waiting_on_broker") return "Waiting on broker";
  if (v === "in_progress") return "In progress";
  if (v === "ready") return "Ready to send";
  if (v === "delivered") return "Delivered";
  if (v === "closed") return "Closed";

  // fallback (unknown custom)
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Canonical request label for chips (requested_outputs / admin_job_requests).
 * Also single source of truth.
 */
export function prettyRequestKey(raw?: string | null) {
  const v = String(raw ?? "").trim().toLowerCase();
  if (!v) return "—";
  if (v === "leaf_snapshot" || v === "snapshot") return "Snapshot";
  if (v === "inspection") return "Inspection";
  if (v === "hes_report" || v === "hes") return "HES";
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Optional: if you want tone in header (same as workflow),
 * you can use this. (Not required, but provided.)
 */
export function responseStatusTone(raw?: string | null): "neutral" | "warn" | "danger" | "good" {
  const v = String(raw ?? "").trim().toLowerCase();

  const mapped =
    v === "waiting" || v === "awaiting_broker" || v === "pending"
      ? "waiting_on_broker"
      : v === "ready_to_send"
      ? "ready"
      : v === "working"
      ? "in_progress"
      : v === "sent"
      ? "delivered"
      : v || "unreviewed";

  if (mapped === "blocked") return "danger";
  if (mapped === "needs_review" || mapped === "waiting_on_broker") return "warn";
  if (mapped === "ready" || mapped === "delivered" || mapped === "closed") return "good";
  return "neutral";
}

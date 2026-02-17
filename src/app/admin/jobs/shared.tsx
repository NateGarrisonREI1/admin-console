// src/app/admin/jobs/shared.tsx

export type JobStatus =
  | "unreviewed"
  | "scheduled"
  | "in_progress"
  | "ready"
  | "delivered"
  | "closed"
  | "needs_review"
  | "waiting_on_broker"
  | "blocked";

export const STATUS_DISPLAY: Record<JobStatus, string> = {
  unreviewed: "New",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  ready: "Ready",
  delivered: "Delivered",
  closed: "Closed",
  needs_review: "Needs Review",
  waiting_on_broker: "Waiting on Broker",
  blocked: "Blocked",
} as const;

/**
 * Nate rules:
 * - info (blue)  = ACTION REQUIRED / admin work queue
 * - good (green) = DONE
 * - danger (red) = BLOCKED
 * - neutral (slate) = fallback
 */
export const STATUS_TONE: Record<JobStatus, "good" | "info" | "danger" | "neutral"> = {
  unreviewed: "info",
  needs_review: "info",
  waiting_on_broker: "info",
  in_progress: "info",
  scheduled: "info",
  ready: "info",
  delivered: "good",
  closed: "good",
  blocked: "danger",
} as const;

export type BrokerJob = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  source?: string | null;
  response_status?: string | null;
  requested_outputs?: string[] | null;
  intake_payload?: any;
  confirmation_code?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
};

export function safeStr(v?: string | null) {
  return (v ?? "").trim();
}

export function normalizeResponse(v?: string | null): JobStatus {
  const key = safeStr(v).toLowerCase();
  if (!key) return "unreviewed";
  if (["waiting", "awaiting_broker", "waiting_on_broker"].includes(key)) return "waiting_on_broker";
  if (key === "ready_to_send") return "ready";
  if (key === "working") return "in_progress";
  if (key === "sent") return "delivered";
  return (key as JobStatus) || "unreviewed";
}

export function statusPill(status?: string | null) {
  const norm = normalizeResponse(status);
  const label = STATUS_DISPLAY[norm] ?? norm.replace(/_/g, " ");

  const tones = {
    good: "bg-green-50 text-green-700 border-green-200",
    info: "bg-blue-50 text-blue-800 border-blue-200",
    danger: "bg-red-50 text-red-800 border-red-200",
    neutral: "bg-slate-100 text-slate-700 border-slate-200",
  } as const;

  const tone = STATUS_TONE[norm] ?? "neutral";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${tones[tone]}`}>
      {label}
    </span>
  );
}

export function addrLine(job: Pick<BrokerJob, "address1" | "city" | "state" | "zip">) {
  const a1 = safeStr(job.address1);
  const parts = [safeStr(job.city), safeStr(job.state), safeStr(job.zip)].filter(Boolean).join(", ");
  return a1 && parts ? `${a1} — ${parts}` : a1 || parts || "—";
}

export function outputsFromRequested(requested_outputs?: string[] | null) {
  const set = new Set((requested_outputs ?? []).map(String));
  return {
    snapshot: set.has("leaf_snapshot") || set.has("snapshot"),
    inspection: set.has("inspection"),
    hes: set.has("hes_report") || set.has("hes"),
  };
}

export function fmtArchivedAt(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function makeMapHref(job: Pick<BrokerJob, "address1" | "city" | "state" | "zip">) {
  const q = encodeURIComponent([job.address1, job.city, job.state, job.zip].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function makeEmailHref(job: Pick<BrokerJob, "intake_payload">) {
  const raw = (job.intake_payload?.raw ?? {}) as any;
  const email = raw.broker_email || raw.agent_email || raw.realtor_email || raw.email || "";
  return email ? `mailto:${email}` : null;
}

export function makePhoneHref(job: Pick<BrokerJob, "intake_payload">) {
  const raw = (job.intake_payload?.raw ?? {}) as any;
  const phone = raw.broker_phone || raw.agent_phone || raw.realtor_phone || raw.phone || "";
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

const GREEN = "#43a419";
const GREEN_LIGHT = "rgba(67,164,25,0.12)";
const GREEN_BORDER = "rgba(67,164,25,0.3)";

export function outputChip(labelText: string, active: boolean) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";

  if (active) {
    return (
      <span
        className={base}
        style={{ background: GREEN_LIGHT, color: GREEN, borderColor: GREEN_BORDER }}
      >
        {labelText}
      </span>
    );
  }

  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{labelText}</span>;
}

// src/app/admin/jobs/page.tsx
import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase/server";

import JobCardClient from "./JobCardClient";

// ── Shared Types & Constants ───────────────────────────────────────────────────

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
  ready: "Ready to Send",
  delivered: "Delivered",
  closed: "Closed",
  needs_review: "Needs Review",
  waiting_on_broker: "Waiting on Broker",
  blocked: "Blocked",
} as const;

export const STATUS_TONE: Record<JobStatus, "good" | "warn" | "info" | "danger" | "neutral"> = {
  unreviewed: "neutral",
  scheduled: "info",
  in_progress: "neutral",
  ready: "good",
  delivered: "good",
  closed: "good",
  needs_review: "warn",
  waiting_on_broker: "warn",
  blocked: "danger",
} as const;

const GREEN = "#43a419";
const GREEN_LIGHT = "rgba(67,164,25,0.12)";
const GREEN_BORDER = "rgba(67,164,25,0.3)";

export type BrokerJob = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  source?: string | null;
  customer_type?: string | null;
  response_status?: string | null;
  inspection_status?: string | null;
  requested_outputs?: string[] | null;
  intake_payload?: any;
  confirmation_code?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;

  // ✅ new (from left-join)
  contractor_leads?: { id: string }[] | null;
};

// ── Shared Helpers ─────────────────────────────────────────────────────────────

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
  const tone = STATUS_TONE[norm];

  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";

  if (tone === "good") {
    return (
      <span
        className={base}
        style={{
          background: GREEN_LIGHT,
          color: GREEN,
          borderColor: GREEN_BORDER,
        }}
      >
        {label}
      </span>
    );
  }

  if (tone === "warn") {
    return <span className={`${base} bg-amber-50 text-amber-800 border-amber-200`}>{label}</span>;
  }

  if (tone === "danger") {
    return <span className={`${base} bg-red-50 text-red-800 border-red-200`}>{label}</span>;
  }

  if (tone === "info") {
    return <span className={`${base} bg-cyan-50 text-cyan-800 border-cyan-200`}>{label}</span>;
  }

  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{label}</span>;
}

export function addrLine(job: BrokerJob) {
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

export function outputChip(labelText: string, active: boolean) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";

  if (active) {
    return (
      <span
        className={base}
        style={{
          background: GREEN_LIGHT,
          color: GREEN,
          borderColor: GREEN_BORDER,
        }}
      >
        {labelText}
      </span>
    );
  }

  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>{labelText}</span>;
}

export function fmtArchivedAt(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function makeMapHref(job: BrokerJob) {
  const q = encodeURIComponent([job.address1, job.city, job.state, job.zip].filter(Boolean).join(" "));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function makeEmailHref(job: BrokerJob) {
  const p = job.intake_payload || {};
  const email = p.broker_email || p.agent_email || p.realtor_email || p.email || "";
  return email ? `mailto:${email}` : null;
}

export function makePhoneHref(job: BrokerJob) {
  const p = job.intake_payload || {};
  const phone = p.broker_phone || p.agent_phone || p.realtor_phone || p.phone || "";
  const digits = String(phone).replace(/[^\d+]/g, "");
  return digits ? `tel:${digits}` : null;
}

// ── Main Page (Server Component) ───────────────────────────────────────────────

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "archived" ? "archived" : "active";

  const supabase = await supabaseServer();

  // ✅ Updated query: left-join contractor_leads so we can show "Lead Posted"
  const { data: jobs, error } = await supabase
    .from("admin_jobs")
    .select(
      `
      id, created_at, updated_at, address1, city, state, zip, source, customer_type, response_status,
      inspection_status, requested_outputs, intake_payload, confirmation_code, is_archived, archived_at,
      contractor_leads:contractor_leads!left(id)
    `
    )
    .eq("source", "broker_public")
    .eq("is_archived", view === "archived")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const list = (jobs ?? []) as BrokerJob[];

  const counts: Record<JobStatus, number> = {
    unreviewed: 0,
    scheduled: 0,
    in_progress: 0,
    ready: 0,
    delivered: 0,
    closed: 0,
    needs_review: 0,
    waiting_on_broker: 0,
    blocked: 0,
  };

  list.forEach((j) => {
    const norm = normalizeResponse(j.response_status);
    counts[norm]++;
  });

  const priorityOrder: Partial<Record<JobStatus, number>> = {
    blocked: 0,
    needs_review: 1,
    waiting_on_broker: 2,
    unreviewed: 3,
    in_progress: 4,
    ready: 5,
    delivered: 6,
    closed: 7,
  };

  const sorted = [...list].sort((a, b) => {
    const pa = priorityOrder[normalizeResponse(a.response_status)] ?? 99;
    const pb = priorityOrder[normalizeResponse(b.response_status)] ?? 99;
    if (pa !== pb) return pa - pb;
    return (
      new Date(b.updated_at || b.created_at).getTime() -
      new Date(a.updated_at || a.created_at).getTime()
    );
  });

  const outs = {
    snapshot: list.filter((j) => outputsFromRequested(j.requested_outputs).snapshot).length,
    inspection: list.filter((j) => outputsFromRequested(j.requested_outputs).inspection).length,
    hes: list.filter((j) => outputsFromRequested(j.requested_outputs).hes).length,
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header Card */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Projects</h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {view === "archived" ? "Archived broker jobs" : "Active broker jobs"} • Manual status
            </p>
            {error && (
              <p className="mt-2 text-sm text-red-600">
                Error loading jobs: {String(error?.message ?? error)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/intake/broker"
              className="inline-flex items-center px-5 py-2.5 bg-green-600 text-white font-medium rounded-lg shadow-sm hover:bg-green-700 transition-colors"
            >
              Open Broker Intake ↗
            </Link>

            <div className="flex gap-2">
              <Link
                href="/admin/jobs"
                className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  view === "active"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                Active
              </Link>
              <Link
                href="/admin/jobs?view=archived"
                className={`px-5 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                  view === "archived"
                    ? "bg-slate-900 text-white border-slate-900"
                    : "bg-white border-slate-200 hover:bg-slate-50"
                }`}
              >
                Archived
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">New</div>
            <div className="mt-1 text-2xl font-semibold">{counts.unreviewed}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Needs Review</div>
            <div className="mt-1 text-2xl font-semibold">{counts.needs_review}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-red-700">
            <div className="text-sm text-red-600">Blocked</div>
            <div className="mt-1 text-2xl font-semibold">{counts.blocked}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Waiting on Broker</div>
            <div className="mt-1 text-2xl font-semibold">{counts.waiting_on_broker}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">In Progress</div>
            <div className="mt-1 text-2xl font-semibold">{counts.in_progress}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-green-700">
            <div className="text-sm text-green-600">Ready</div>
            <div className="mt-1 text-2xl font-semibold">{counts.ready}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-green-700">
            <div className="text-sm text-green-600">Delivered</div>
            <div className="mt-1 text-2xl font-semibold">{counts.delivered}</div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-sm text-slate-500">Closed</div>
            <div className="mt-1 text-2xl font-semibold">{counts.closed}</div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {outputChip(`${outs.snapshot} Snapshot`, !!outs.snapshot)}
          {outputChip(`${outs.inspection} Inspection`, !!outs.inspection)}
          {outputChip(`${outs.hes} HES`, !!outs.hes)}
          <span className="text-sm text-slate-500 self-center">
            Showing up to 200 {view === "archived" ? "archived" : "active"} broker jobs
          </span>
        </div>
      </div>

      {/* Job List */}
      <div className="space-y-4">
        {sorted.length ? (
          sorted.map((job) => (
            <JobCardClient
              key={job.id}
              job={job}
              mode={view}
              hasLead={(job.contractor_leads?.length ?? 0) > 0}
            />
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No {view === "archived" ? "archived" : "active"} broker jobs found.
          </div>
        )}
      </div>
    </div>
  );
}

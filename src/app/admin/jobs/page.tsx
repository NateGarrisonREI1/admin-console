// src/app/admin/jobs/page.tsx
import Link from "next/link";
import { supabaseServer } from "../../../lib/supabase/server";

import JobsTableClient from "./JobsTableClient";
import { outputChip } from "./shared";

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

export type ContractorLeadRow = {
  id: string;
  status?: string | null;
};

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

  lead_posted?: boolean | null;
  lead_posted_at?: string | null;

  contractor_leads?: ContractorLeadRow[] | null;

  // client-only helper injected server-side
  __normalized_status?: JobStatus;
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

export function outputsFromRequested(requested_outputs?: string[] | null) {
  const set = new Set((requested_outputs ?? []).map((s) => String(s).toLowerCase()));
  return {
    snapshot: set.has("leaf_snapshot") || set.has("snapshot"),
    inspection: set.has("inspection"),
    hes: set.has("hes_report") || set.has("hes"),
  };
}

type Opt = { id: string; name: string };

export default async function JobsPage({
  searchParams,
}: {
  searchParams?: Promise<{ view?: string }>;
}) {
  const sp = searchParams ? await searchParams : undefined;
  const view = sp?.view === "archived" ? "archived" : "active";

  const supabase = await supabaseServer();

  // 1) Load jobs (ALL projects; not broker-only)
  const { data: jobs, error } = await supabase
    .from("admin_jobs")
    .select(
      `
      id, created_at, updated_at, address1, city, state, zip, source, customer_type, response_status,
      inspection_status, requested_outputs, intake_payload, confirmation_code, is_archived, archived_at,
      lead_posted, lead_posted_at,
      contractor_leads:contractor_leads!left(id, status)
    `
    )
    .eq("is_archived", view === "archived")
    .order("updated_at", { ascending: false, nullsFirst: false })
    .limit(200);

  const list = (jobs ?? []) as BrokerJob[];

  // 2) Load contractor dropdown options
  const { data: contractorRows } = await supabase
    .from("app_profiles")
    .select("id, full_name, company_name, email, role")
    .eq("role", "contractor")
    .order("company_name", { ascending: true, nullsFirst: false })
    .limit(500);

  const contractors: Opt[] = (contractorRows ?? []).map((r: any) => {
    const name =
      String(r.company_name || "").trim() ||
      String(r.full_name || "").trim() ||
      String(r.email || "").trim() ||
      r.id;
    return { id: r.id, name };
  });

  // 3) Load systems dropdown options (optional)
  let systems: Opt[] = [];
  try {
    const { data: systemRows } = await supabase
      .from("system_catalog")
      .select("id, name, title")
      .order("name", { ascending: true, nullsFirst: false })
      .limit(500);

    systems = (systemRows ?? []).map((s: any) => ({
      id: s.id,
      name: String(s.name || s.title || s.id),
    }));
  } catch {
    systems = [];
  }

  const priorityOrder: Partial<Record<JobStatus, number>> = {
    blocked: 0,
    needs_review: 1,
    waiting_on_broker: 2,
    unreviewed: 3,
    in_progress: 4,
    ready: 5,
    scheduled: 6,
    delivered: 7,
    closed: 8,
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

  const sortedWithNorm = sorted.map((j) => ({
    ...j,
    __normalized_status: normalizeResponse(j.response_status),
  }));

  const outs = {
    snapshot: list.filter((j) => outputsFromRequested(j.requested_outputs).snapshot).length,
    inspection: list.filter((j) => outputsFromRequested(j.requested_outputs).inspection).length,
    hes: list.filter((j) => outputsFromRequested(j.requested_outputs).hes).length,
  };

  return (
    <div className="space-y-5">
      <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 12, padding: 20 }}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#f1f5f9", letterSpacing: -0.3 }}>Projects</h1>
            <p style={{ marginTop: 6, fontSize: 13, color: "#94a3b8" }}>
              {view === "archived" ? "Archived projects" : "Active projects"} {"\u2022"} Status managed in Console
            </p>
            {error && (
              <p style={{ marginTop: 8, fontSize: 13, color: "#ef4444" }}>
                Error loading jobs: {String((error as any)?.message ?? error)}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/intake/broker"
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 16px",
                background: "#10b981",
                color: "white",
                fontWeight: 600,
                fontSize: 13,
                borderRadius: 8,
                textDecoration: "none",
                transition: "background 0.15s ease",
              }}
            >
              Open Broker Intake {"\u2197"}
            </Link>

            <div className="flex gap-2">
              <Link
                href="/admin/jobs"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  border: view === "active" ? "1px solid rgba(16,185,129,0.25)" : "1px solid #334155",
                  background: view === "active" ? "rgba(16,185,129,0.10)" : "transparent",
                  color: view === "active" ? "#10b981" : "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                Active
              </Link>
              <Link
                href="/admin/jobs?view=archived"
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  border: view === "archived" ? "1px solid rgba(16,185,129,0.25)" : "1px solid #334155",
                  background: view === "archived" ? "rgba(16,185,129,0.10)" : "transparent",
                  color: view === "archived" ? "#10b981" : "#94a3b8",
                  transition: "all 0.15s ease",
                }}
              >
                Archived
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {outputChip(`${outs.snapshot} Snapshot`, !!outs.snapshot)}
          {outputChip(`${outs.inspection} Inspection`, !!outs.inspection)}
          {outputChip(`${outs.hes} HES`, !!outs.hes)}
          <span style={{ fontSize: 13, color: "#64748b", alignSelf: "center" }}>
            Showing up to 200 {view === "archived" ? "archived" : "active"} projects
          </span>
        </div>
      </div>

      {sortedWithNorm.length ? (
        <JobsTableClient jobs={sortedWithNorm} mode={view} contractors={contractors} systems={systems} />
      ) : (
        <div style={{
          borderRadius: 12,
          border: "1px dashed #334155",
          background: "rgba(30,41,59,0.5)",
          padding: "40px 16px",
          textAlign: "center",
          color: "#64748b",
        }}>
          No {view === "archived" ? "archived" : "active"} projects found.
        </div>
      )}
    </div>
  );
}

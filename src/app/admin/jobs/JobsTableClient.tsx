"use client";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  archiveJobAction,
  unarchiveJobAction,
  hardDeleteJobAction,
  createLeadFromAdminJobAction,
  updateLeadForAdminJobAction,
  removeLeadForAdminJobAction,
} from "./actions";

import {
  safeStr,
  outputsFromRequested,
  addrLine,
  statusPill,
  makeMapHref,
  makeEmailHref,
  makePhoneHref,
  fmtArchivedAt,
} from "./shared";

import type { BrokerJob, JobStatus } from "./page";

type Opt = { id: string; name: string };
type LeadStatus = "not_posted" | "posted" | "purchased";

function leadStatusOf(job: BrokerJob): LeadStatus {
  const leads = job.contractor_leads ?? [];
  const purchased = leads.some((l: any) => String(l?.status ?? "").toLowerCase() === "purchased");
  if (purchased) return "purchased";
  if (Boolean((job as any).lead_posted)) return "posted";
  if (leads.length) return "posted";
  return "not_posted";
}

function LeadStatusPill({ value }: { value: LeadStatus }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border";
  if (value === "purchased") {
    return <span className={`${base} bg-emerald-900/40 text-emerald-400 border-emerald-700/50`}>Purchased</span>;
  }
  if (value === "posted") {
    return <span className={`${base} bg-blue-900/40 text-blue-400 border-blue-700/50`}>Posted</span>;
  }
  return <span className={`${base} bg-slate-700/40 text-slate-400 border-slate-600/50`}>Not posted</span>;
}

function getNameLines(job: BrokerJob) {
  const raw = (job.intake_payload?.raw ?? {}) as any;

  const client = safeStr(raw.client_name);
  const broker = safeStr(raw.broker_name);
  const code = safeStr(job.confirmation_code);

  if (client) return { primary: client, secondary: broker || "" };
  if (broker) return { primary: broker, secondary: code || "" };
  return { primary: code || `Project ${job.id.slice(0, 8)}`, secondary: "" };
}

function ServicesCell({ job }: { job: BrokerJob }) {
  const outs = outputsFromRequested(job.requested_outputs);

  const chip = (label: string, on: boolean) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
    return on ? (
      <span className={`${base}`} style={{ background: "rgba(148,163,184,0.1)", color: "#cbd5e1", borderColor: "#475569" }}>{label}</span>
    ) : (
      <span className={`${base}`} style={{ background: "transparent", color: "#475569", borderColor: "#334155" }}>{label}</span>
    );
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {chip("Snapshot", outs.snapshot)}
      {chip("HES", outs.hes)}
      {chip("Inspection", outs.inspection)}
    </div>
  );
}

function dollarsToCents(input: string) {
  const s = input.trim();
  if (!s) return null;
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 100);
}

export default function JobsTableClient({
  jobs,
  mode,
  contractors,
  systems,
}: {
  jobs: BrokerJob[];
  mode: "active" | "archived";
  contractors: Opt[];
  systems: Opt[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Search + filters
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all");
  const [leadFilter, setLeadFilter] = useState<LeadStatus | "all">("all");
  const [needSnapshot, setNeedSnapshot] = useState(false);
  const [needHes, setNeedHes] = useState(false);
  const [needInspection, setNeedInspection] = useState(false);

  // Drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerJob, setDrawerJob] = useState<BrokerJob | null>(null);

  // Drawer lead config
  const [drawerLeadMode, setDrawerLeadMode] = useState<"create" | "edit">("create");
  const [priceDollars, setPriceDollars] = useState<string>("99.00");
  const [expiresAt, setExpiresAt] = useState<string>("");
  const [systemId, setSystemId] = useState<string>("");
  const [assignedContractorId, setAssignedContractorId] = useState<string>("");
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);
  const [titleOverride, setTitleOverride] = useState<string>("");
  const [summaryOverride, setSummaryOverride] = useState<string>("");

  const closeDrawer = () => {
    if (isPending) return;
    setDrawerOpen(false);
  };

  const openDrawer = (job: BrokerJob) => {
    setDrawerJob(job);
    setDrawerOpen(true);
    setDrawerLeadMode(leadStatusOf(job) === "not_posted" ? "create" : "edit");
    setPriceDollars("99.00");
    setExpiresAt("");
    setSystemId("");
    setAssignedContractorId("");
    setAssignedOnly(false);
    setTitleOverride("");
    setSummaryOverride("");
  };

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();

    return jobs.filter((job) => {
      const status = (job as any).__normalized_status as JobStatus | undefined;
      const lead = leadStatusOf(job);
      const outs = outputsFromRequested(job.requested_outputs);

      if (statusFilter !== "all" && status !== statusFilter) return false;
      if (leadFilter !== "all" && lead !== leadFilter) return false;

      if (needSnapshot && !outs.snapshot) return false;
      if (needHes && !outs.hes) return false;
      if (needInspection && !outs.inspection) return false;

      if (!query) return true;

      const raw = (job.intake_payload?.raw ?? {}) as any;
      const hay = [
        raw.client_name,
        raw.broker_name,
        job.address1,
        job.city,
        job.state,
        job.zip,
        job.confirmation_code,
        job.id,
        job.source,
      ]
        .map((v) => safeStr(v as any).toLowerCase())
        .filter(Boolean)
        .join(" ");

      return hay.includes(query);
    });
  }, [jobs, q, statusFilter, leadFilter, needSnapshot, needHes, needInspection]);

  const allStatuses: JobStatus[] = [
    "unreviewed",
    "needs_review",
    "waiting_on_broker",
    "blocked",
    "in_progress",
    "ready",
    "scheduled",
    "delivered",
    "closed",
  ];

  async function submitLead() {
    if (!drawerJob || isPending) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", drawerJob.id);

        const cents = dollarsToCents(priceDollars);
        if (cents != null) fd.set("price_cents", String(cents));
        if (expiresAt) fd.set("expires_at", expiresAt);
        if (systemId) fd.set("system_catalog_id", systemId);
        if (assignedContractorId) fd.set("assigned_contractor_profile_id", assignedContractorId);
        if (assignedOnly) fd.set("is_assigned_only", "on");
        if (titleOverride.trim()) fd.set("title", titleOverride.trim());
        if (summaryOverride.trim()) fd.set("summary", summaryOverride.trim());

        if (drawerLeadMode === "create") await createLeadFromAdminJobAction(fd);
        else await updateLeadForAdminJobAction(fd);

        setDrawerOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to save lead.");
      }
    });
  }

  async function removeLead() {
    if (!drawerJob || isPending) return;
    if (!confirm("Remove this lead? It will disappear from the contractor job board.")) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", drawerJob.id);
        await removeLeadForAdminJobAction(fd);
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to remove lead.");
      }
    });
  }

  async function archiveJob() {
    if (!drawerJob || isPending) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", drawerJob.id);
        await archiveJobAction(fd);
        setDrawerOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to archive project.");
      }
    });
  }

  async function unarchiveJob() {
    if (!drawerJob || isPending) return;
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", drawerJob.id);
        await unarchiveJobAction(fd);
        setDrawerOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to unarchive project.");
      }
    });
  }

  async function hardDeleteJob() {
    if (!drawerJob || isPending) return;
    const confirmStr = prompt('Type "DELETE" to permanently delete this project:');
    if (String(confirmStr || "").toUpperCase() !== "DELETE") return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", drawerJob.id);
        fd.set("confirm", "DELETE");
        await hardDeleteJobAction(fd);
        setDrawerOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err?.message ?? "Failed to delete project.");
      }
    });
  }

  const drawerStatus = drawerJob ? ((drawerJob as any).__normalized_status as JobStatus | undefined) : undefined;
  const drawerLead = drawerJob ? leadStatusOf(drawerJob) : "not_posted";
  const mapHref = drawerJob ? makeMapHref(drawerJob) : "#";
  const phoneHref = drawerJob ? makePhoneHref(drawerJob) : null;
  const emailHref = drawerJob ? makeEmailHref(drawerJob) : null;
  const archivedDate = drawerJob ? fmtArchivedAt(drawerJob.archived_at) : null;

  const filterBtn = (label: string, active: boolean, onClick: () => void) => (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: 8,
        fontSize: 12,
        fontWeight: 600,
        border: active ? "1px solid rgba(16,185,129,0.25)" : "1px solid #334155",
        background: active ? "rgba(16,185,129,0.10)" : "transparent",
        color: active ? "#10b981" : "#94a3b8",
        cursor: "pointer",
        transition: "all 0.1s ease",
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div style={{ overflow: "hidden", borderRadius: 12, border: "1px solid #334155", background: "#1e293b" }}>
        {/* Toolbar */}
        <div style={{ borderBottom: "1px solid #334155", padding: 12 }}>
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, address, zip, job id\u2026"
                className="admin-input"
                style={{ maxWidth: 400 }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="admin-select"
                style={{ width: "auto", minWidth: 140 }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
              >
                <option value="all">All statuses</option>
                {allStatuses.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>

              <select
                className="admin-select"
                style={{ width: "auto", minWidth: 140 }}
                value={leadFilter}
                onChange={(e) => setLeadFilter(e.target.value as any)}
              >
                <option value="all">All lead statuses</option>
                <option value="not_posted">Not posted</option>
                <option value="posted">Posted</option>
                <option value="purchased">Purchased</option>
              </select>

              {filterBtn("Snapshot", needSnapshot, () => setNeedSnapshot((v) => !v))}
              {filterBtn("HES", needHes, () => setNeedHes((v) => !v))}
              {filterBtn("Inspection", needInspection, () => setNeedInspection((v) => !v))}
            </div>
          </div>

          <div style={{ marginTop: 8, fontSize: 13, color: "#64748b" }}>
            Showing <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{filtered.length}</span> of{" "}
            <span style={{ fontWeight: 600, color: "#cbd5e1" }}>{jobs.length}</span> {mode} projects
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="admin-table" style={{ minWidth: 980 }}>
            <thead>
              <tr>
                <th style={{ width: 220 }}>Name</th>
                <th>Address</th>
                <th style={{ width: 180 }}>Project Status</th>
                <th style={{ width: 260 }}>Services Requested</th>
                <th style={{ width: 150 }}>Lead Status</th>
                <th style={{ width: 170, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((job) => {
                const status = (job as any).__normalized_status as JobStatus | undefined;
                const lead = leadStatusOf(job);
                const { primary, secondary } = getNameLines(job);

                return (
                  <Fragment key={job.id}>
                    <tr
                      className="cursor-pointer"
                      onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") router.push(`/admin/jobs/${job.id}`);
                      }}
                    >
                      <td>
                        <div style={{ fontWeight: 600, color: "#f1f5f9" }}>{primary}</div>
                        {secondary ? <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>{secondary}</div> : null}
                      </td>

                      <td>
                        <div style={{ maxWidth: 520 }} className="truncate">{addrLine(job)}</div>
                        {job.source ? <div style={{ marginTop: 2, fontSize: 12, color: "#64748b" }}>Source: {String(job.source)}</div> : null}
                      </td>

                      <td>{statusPill(status ?? job.response_status)}</td>

                      <td>
                        <ServicesCell job={job} />
                      </td>

                      <td>
                        <LeadStatusPill value={lead} />
                      </td>

                      <td>
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 12px",
                              borderRadius: 8,
                              background: "#10b981",
                              color: "white",
                              fontSize: 12,
                              fontWeight: 600,
                              textDecoration: "none",
                            }}
                          >
                            Console {"\u2192"}
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(job);
                            }}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 12px",
                              borderRadius: 8,
                              border: "1px solid #334155",
                              background: "transparent",
                              color: "#94a3b8",
                              fontSize: 12,
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                            aria-label="Open actions"
                          >
                            {"\u2022\u2022\u2022"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}

              {!filtered.length && (
                <tr>
                  <td colSpan={6} style={{ padding: "40px 24px", textAlign: "center", color: "#64748b" }}>
                    No projects match your search/filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {drawerOpen && drawerJob && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeDrawer} />

          <div
            className="absolute right-0 top-0 h-full w-full sm:w-[540px] flex flex-col"
            style={{ background: "#0f172a", borderLeft: "1px solid #334155", boxShadow: "0 0 40px rgba(0,0,0,0.5)" }}
          >
            <div style={{ padding: 20, borderBottom: "1px solid #334155" }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div style={{ fontSize: 12, color: "#64748b" }}>Project Actions</div>
                  <h2 style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }} className="truncate">{getNameLines(drawerJob).primary}</h2>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#94a3b8" }}>{addrLine(drawerJob)}</div>

                  <div className="mt-3 flex flex-wrap gap-2 items-center">
                    {statusPill(drawerStatus ?? drawerJob.response_status)}
                    <LeadStatusPill value={drawerLead} />
                    {drawerJob.is_archived ? (
                      <span className="rounded-full px-2.5 py-0.5 text-xs font-medium border" style={{ background: "rgba(51,65,85,0.4)", color: "#94a3b8", borderColor: "#334155" }}>
                        Archived{archivedDate ? ` \u2022 ${archivedDate}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={closeDrawer}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "1px solid #334155",
                    background: "#1e293b",
                    color: "#94a3b8",
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  {"\u2715"}
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="admin-btn-secondary"
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  Map
                </a>

                {phoneHref ? (
                  <a href={phoneHref} className="admin-btn-secondary" style={{ fontSize: 13, padding: "6px 14px" }}>
                    Call
                  </a>
                ) : (
                  <span className="admin-btn-secondary" style={{ fontSize: 13, padding: "6px 14px", opacity: 0.4 }}>
                    Call
                  </span>
                )}

                {emailHref ? (
                  <a href={emailHref} className="admin-btn-secondary" style={{ fontSize: 13, padding: "6px 14px" }}>
                    Email
                  </a>
                ) : (
                  <span className="admin-btn-secondary" style={{ fontSize: 13, padding: "6px 14px", opacity: 0.4 }}>
                    Email
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/admin/jobs/${drawerJob.id}`)}
                  className="admin-btn-primary ml-auto"
                  style={{ fontSize: 13, padding: "6px 14px" }}
                >
                  Open Console {"\u2192"}
                </button>
              </div>
            </div>

            <div style={{ padding: 20 }} className="overflow-auto flex-1 space-y-5">
              <div style={{ borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Lead</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Not posted / Posted / Purchased.</div>
                  </div>

                  {drawerLead === "not_posted" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDrawerLeadMode("create")}
                      className="admin-btn-primary"
                      style={{ fontSize: 12, padding: "5px 12px" }}
                    >
                      Configure + Post
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDrawerLeadMode("edit")}
                        className="admin-btn-secondary"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={removeLead}
                        className="admin-btn-danger"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4">
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>
                    {drawerLeadMode === "create" ? "Configure + Post Lead" : "Edit Lead"}
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Price (USD)</label>
                    <div className="flex items-center gap-2">
                      <span style={{ color: "#64748b" }}>$</span>
                      <input
                        value={priceDollars}
                        onChange={(e) => setPriceDollars(e.target.value)}
                        className="admin-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Expiration</label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>System (optional)</label>
                    <select
                      value={systemId}
                      onChange={(e) => setSystemId(e.target.value)}
                      className="admin-select"
                    >
                      <option value="">{"\u2014"} None {"\u2014"}</option>
                      {systems?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ borderRadius: 12, border: "1px solid #334155", padding: 14 }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>Assign to contractor</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>Assigned-only = only that contractor sees it.</div>
                      </div>
                      <label className="inline-flex items-center gap-2" style={{ fontSize: 12, color: "#94a3b8" }}>
                        <input
                          type="checkbox"
                          checked={assignedOnly}
                          onChange={(e) => setAssignedOnly(e.target.checked)}
                          className="h-4 w-4"
                          style={{ accentColor: "#10b981" }}
                        />
                        Assigned-only
                      </label>
                    </div>

                    <select
                      value={assignedContractorId}
                      onChange={(e) => setAssignedContractorId(e.target.value)}
                      className="admin-select"
                      style={{ marginTop: 10 }}
                    >
                      <option value="">{"\u2014"} No assignment {"\u2014"}</option>
                      {contractors?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Title (optional)</label>
                    <input
                      value={titleOverride}
                      onChange={(e) => setTitleOverride(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#cbd5e1", marginBottom: 6 }}>Summary (optional)</label>
                    <textarea
                      value={summaryOverride}
                      onChange={(e) => setSummaryOverride(e.target.value)}
                      rows={3}
                      className="admin-input"
                      style={{ resize: "vertical" }}
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={submitLead}
                      className="admin-btn-primary"
                      style={{ fontSize: 13, opacity: isPending ? 0.5 : 1 }}
                    >
                      {drawerLeadMode === "create" ? "Post Lead" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ borderRadius: 12, border: "1px solid #334155", padding: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Project</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === "active" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={archiveJob}
                      className="admin-btn-secondary"
                      style={{ fontSize: 13 }}
                    >
                      Archive Project
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={unarchiveJob}
                      className="admin-btn-secondary"
                      style={{ fontSize: 13 }}
                    >
                      Unarchive
                    </button>
                  )}

                  {mode === "archived" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={hardDeleteJob}
                      className="admin-btn-danger ml-auto"
                      style={{ fontSize: 13 }}
                    >
                      Delete Permanently
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div style={{ padding: 14, borderTop: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, color: "#64748b" }}>{isPending ? "Saving\u2026" : "All edits happen here or in Console."}</div>
              <button
                type="button"
                disabled={isPending}
                onClick={closeDrawer}
                className="admin-btn-secondary"
                style={{ fontSize: 13 }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

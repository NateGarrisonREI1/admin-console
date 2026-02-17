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
    return <span className={`${base} bg-green-50 text-green-700 border-green-200`}>Purchased</span>;
  }
  if (value === "posted") {
    return <span className={`${base} bg-blue-50 text-blue-800 border-blue-200`}>Posted</span>;
  }
  return <span className={`${base} bg-slate-100 text-slate-700 border-slate-200`}>Not posted</span>;
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

  // Neutral-only chips to reduce color noise
  const chip = (label: string, on: boolean) => {
    const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border";
    return on ? (
      <span className={`${base} bg-slate-100 text-slate-800 border-slate-200`}>{label}</span>
    ) : (
      <span className={`${base} bg-white text-slate-300 border-slate-200`}>{label}</span>
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

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {/* Toolbar ABOVE columns */}
        <div className="border-b border-slate-200 bg-white p-3">
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, address, zip, job id…"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={leadFilter}
                onChange={(e) => setLeadFilter(e.target.value as any)}
              >
                <option value="all">All lead statuses</option>
                <option value="not_posted">Not posted</option>
                <option value="posted">Posted</option>
                <option value="purchased">Purchased</option>
              </select>

              <button
                onClick={() => setNeedSnapshot((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  needSnapshot ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                Snapshot
              </button>

              <button
                onClick={() => setNeedHes((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  needHes ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                HES
              </button>

              <button
                onClick={() => setNeedInspection((v) => !v)}
                className={`rounded-xl border px-3 py-2 text-sm ${
                  needInspection ? "bg-slate-100 border-slate-200 text-slate-900" : "bg-white border-slate-200 text-slate-600"
                }`}
              >
                Inspection
              </button>
            </div>
          </div>

          <div className="mt-2 text-sm text-slate-500">
            Showing <span className="font-medium text-slate-900">{filtered.length}</span> of{" "}
            <span className="font-medium text-slate-900">{jobs.length}</span> {mode} projects
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-slate-600">
                <th className="px-4 py-3 w-[220px]">Name</th>
                <th className="px-4 py-3">Address</th>
                <th className="px-4 py-3 w-[180px]">Project Status</th>
                <th className="px-4 py-3 w-[260px]">Services Requested</th>
                <th className="px-4 py-3 w-[150px]">Lead Status</th>
                <th className="px-4 py-3 w-[170px] text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((job, idx) => {
                const status = (job as any).__normalized_status as JobStatus | undefined;
                const lead = leadStatusOf(job);
                const { primary, secondary } = getNameLines(job);
                const zebra = idx % 2 === 0 ? "bg-white" : "bg-slate-50/70";

                return (
                  <Fragment key={job.id}>
                    <tr
                      className={`border-t border-slate-100 ${zebra} hover:bg-slate-100/70 cursor-pointer`}
                      onClick={() => router.push(`/admin/jobs/${job.id}`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") router.push(`/admin/jobs/${job.id}`);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{primary}</div>
                        {secondary ? <div className="mt-0.5 text-xs text-slate-400">{secondary}</div> : null}
                      </td>

                      <td className="px-4 py-3 text-slate-700">
                        <div className="max-w-[520px] truncate">{addrLine(job)}</div>
                        {job.source ? <div className="mt-0.5 text-xs text-slate-400">Source: {String(job.source)}</div> : null}
                      </td>

                      <td className="px-4 py-3">{statusPill(status ?? job.response_status)}</td>

                      <td className="px-4 py-3">
                        <ServicesCell job={job} />
                      </td>

                      <td className="px-4 py-3">
                        <LeadStatusPill value={lead} />
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/admin/jobs/${job.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center rounded-xl bg-[#43a419] px-3 py-2 text-xs font-medium text-white hover:bg-[#3a8f16]"
                          >
                            Console →
                          </Link>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDrawer(job);
                            }}
                            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium hover:bg-slate-50"
                            aria-label="Open actions"
                          >
                            •••
                          </button>
                        </div>
                      </td>
                    </tr>
                  </Fragment>
                );
              })}

              {!filtered.length && (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    No projects match your search/filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer (unchanged behavior) */}
      {drawerOpen && drawerJob && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/30" onClick={closeDrawer} />

          <div className="absolute right-0 top-0 h-full w-full sm:w-[540px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs text-slate-500">Project Actions</div>
                  <h2 className="text-lg font-semibold text-slate-900 truncate">{getNameLines(drawerJob).primary}</h2>
                  <div className="mt-1 text-sm text-slate-600">{addrLine(drawerJob)}</div>

                  <div className="mt-2 flex flex-wrap gap-2 items-center">
                    {statusPill(drawerStatus ?? drawerJob.response_status)}
                    <LeadStatusPill value={drawerLead} />
                    {drawerJob.is_archived ? (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                        Archived{archivedDate ? ` • ${archivedDate}` : ""}
                      </span>
                    ) : null}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={closeDrawer}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={mapHref}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  📍 Map
                </a>

                {phoneHref ? (
                  <a
                    href={phoneHref}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    📞 Call
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                    📞 Call
                  </span>
                )}

                {emailHref ? (
                  <a
                    href={emailHref}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    ✉️ Email
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-400">
                    ✉️ Email
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => router.push(`/admin/jobs/${drawerJob.id}`)}
                  className="ml-auto inline-flex items-center gap-2 rounded-xl bg-[#43a419] px-4 py-2 text-sm font-medium text-white hover:bg-[#3a8f16]"
                >
                  Open Console →
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto flex-1 space-y-6">
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Lead</div>
                    <div className="text-xs text-slate-500">Not posted / Posted / Purchased.</div>
                  </div>

                  {drawerLead === "not_posted" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDrawerLeadMode("create")}
                      className="rounded-xl bg-[#43a419] px-3 py-2 text-xs font-semibold text-white hover:bg-[#3a8f16] disabled:opacity-50"
                    >
                      Configure + Post
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => setDrawerLeadMode("edit")}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50 disabled:opacity-50"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={removeLead}
                        className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 grid gap-4">
                  <div className="text-sm font-medium text-slate-900">
                    {drawerLeadMode === "create" ? "Configure + Post Lead" : "Edit Lead"}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900">Price (USD)</label>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-slate-500">$</span>
                      <input
                        value={priceDollars}
                        onChange={(e) => setPriceDollars(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900">Expiration</label>
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(e) => setExpiresAt(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900">System (optional)</label>
                    <select
                      value={systemId}
                      onChange={(e) => setSystemId(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">— None —</option>
                      {systems?.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-medium text-slate-900">Assign to contractor</div>
                        <div className="text-xs text-slate-500">Assigned-only = only that contractor sees it.</div>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={assignedOnly}
                          onChange={(e) => setAssignedOnly(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Assigned-only
                      </label>
                    </div>

                    <select
                      value={assignedContractorId}
                      onChange={(e) => setAssignedContractorId(e.target.value)}
                      className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    >
                      <option value="">— No assignment —</option>
                      {contractors?.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900">Title (optional)</label>
                    <input
                      value={titleOverride}
                      onChange={(e) => setTitleOverride(e.target.value)}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-900">Summary (optional)</label>
                    <textarea
                      value={summaryOverride}
                      onChange={(e) => setSummaryOverride(e.target.value)}
                      rows={3}
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={submitLead}
                      className="rounded-xl bg-[#43a419] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3a8f16] disabled:opacity-50"
                    >
                      {drawerLeadMode === "create" ? "Post Lead" : "Save Changes"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-sm font-semibold text-slate-900">Project</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {mode === "active" ? (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={archiveJob}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      📦 Archive Project
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={unarchiveJob}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
                    >
                      ♻️ Unarchive
                    </button>
                  )}

                  {mode === "archived" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={hardDeleteJob}
                      className="ml-auto rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
                    >
                      🗑️ Delete Permanently
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 flex items-center justify-between">
              <div className="text-xs text-slate-500">{isPending ? "Saving…" : "All edits happen here or in Console."}</div>
              <button
                type="button"
                disabled={isPending}
                onClick={closeDrawer}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
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

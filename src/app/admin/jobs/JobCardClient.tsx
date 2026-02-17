"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
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
  outputChip,
  addrLine,
  fmtArchivedAt,
  makeMapHref,
  makeEmailHref,
  makePhoneHref,
  statusPill,
} from "./shared";

type BrokerJob = {
  id: string;
  created_at: string;
  updated_at?: string | null;
  address1?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  intake_payload?: any;
  requested_outputs?: string[] | null;
  response_status?: string | null;
  is_archived?: boolean | null;
  archived_at?: string | null;
};

type Opt = { id: string; name: string };

function dollarsToCents(input: string) {
  const s = input.trim();
  if (!s) return null;
  const v = Number(s);
  if (!Number.isFinite(v)) return null;
  return Math.round(v * 100);
}

function centsToDollars(cents?: number | null) {
  if (typeof cents !== "number") return "";
  return (cents / 100).toFixed(2);
}

export default function JobCardClient({
  job,
  mode,
  hasLead = false,
  contractors = [],
  systems = [],
}: {
  job: BrokerJob;
  mode: "active" | "archived";
  hasLead?: boolean;

  // Optional lists for drawer dropdowns. Pass from server page when ready.
  contractors?: Opt[];
  systems?: Opt[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Right-side drawer
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");

  // We still keep optimistic label, but always confirm via refresh
  const [optimisticHasLead, setOptimisticHasLead] = useState<boolean>(hasLead);
  useEffect(() => setOptimisticHasLead(hasLead), [hasLead]);

  const outs = outputsFromRequested(job.requested_outputs);
  const p = job.intake_payload || {};

  const brokerName = safeStr(
    p.broker_name || p.agent_name || p.realtor_name || p.broker?.name || "Broker"
  );

  const mapHref = makeMapHref(job);
  const phoneHref = makePhoneHref(job);
  const emailHref = makeEmailHref(job);
  const archivedDate = fmtArchivedAt(job.archived_at);

  // Drawer state (defaults)
  const [priceDollars, setPriceDollars] = useState<string>("99.00");
  const [expiresAt, setExpiresAt] = useState<string>(""); // datetime-local string
  const [systemId, setSystemId] = useState<string>("");
  const [assignedContractorId, setAssignedContractorId] = useState<string>("");
  const [assignedOnly, setAssignedOnly] = useState<boolean>(false);

  const [titleOverride, setTitleOverride] = useState<string>("");
  const [summaryOverride, setSummaryOverride] = useState<string>("");

  // When drawer opens, set sane defaults
  useEffect(() => {
    if (!drawerOpen) return;

    // Defaults for create
    if (drawerMode === "create") {
      setPriceDollars("99.00");
      setExpiresAt("");
      setSystemId("");
      setAssignedContractorId("");
      setAssignedOnly(false);
      setTitleOverride("");
      setSummaryOverride("");
    }

    // If edit mode, we don't have lead fields in this component yet.
    // We'll still allow editing with default values or by typing.
    // (If you later pass lead fields into JobCardClient, we can prefill.)
  }, [drawerOpen, drawerMode]);

  const contractorOptions = useMemo(() => contractors ?? [], [contractors]);
  const systemOptions = useMemo(() => systems ?? [], [systems]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openDrawer(mode: "create" | "edit") {
    setDrawerMode(mode);
    setDrawerOpen(true);
    setIsMenuOpen(false);
  }

  async function submitDrawer() {
    if (isPending) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", job.id);

        const cents = dollarsToCents(priceDollars);
        if (cents != null) fd.set("price_cents", String(cents));

        // expiresAt is datetime-local; convert to ISO on server action
        if (expiresAt) fd.set("expires_at", expiresAt);

        if (systemId) fd.set("system_catalog_id", systemId);

        if (assignedContractorId) fd.set("assigned_contractor_profile_id", assignedContractorId);

        if (assignedOnly) fd.set("is_assigned_only", "on");

        if (titleOverride.trim()) fd.set("title", titleOverride.trim());
        if (summaryOverride.trim()) fd.set("summary", summaryOverride.trim());

        if (drawerMode === "create") {
          await createLeadFromAdminJobAction(fd);
          setOptimisticHasLead(true);
        } else {
          await updateLeadForAdminJobAction(fd);
        }

        setDrawerOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("Lead drawer submit failed:", err);
        alert(err?.message ?? "Failed to save lead.");
      }
    });
  }

  async function removeLead() {
    if (isPending) return;

    const ok = confirm("Remove this lead? It will disappear from the job board.");
    if (!ok) return;

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("job_id", job.id);

        await removeLeadForAdminJobAction(fd);

        setOptimisticHasLead(false);
        setIsMenuOpen(false);
        router.refresh();
      } catch (err: any) {
        console.error("Remove lead failed:", err);
        alert(err?.message ?? "Failed to remove lead.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm relative">
      <div className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-lg font-semibold tracking-tight truncate">{brokerName}</h3>

              {statusPill(job.response_status)}
              {outs.snapshot && outputChip("Snapshot", true)}
              {outs.inspection && outputChip("Inspection", false)}
              {outs.hes && outputChip("HES", false)}

              {mode === "active" && optimisticHasLead ? (
                <span className="rounded-full bg-[#43a419]/10 px-2.5 py-0.5 text-xs font-semibold text-[#2f7a10] border border-[#43a419]/30">
                  Lead Posted
                </span>
              ) : null}

              {mode === "archived" && (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700 border border-slate-200">
                  Archived
                </span>
              )}
            </div>

            <div className="text-sm text-slate-600">{addrLine(job)}</div>

            {archivedDate && (
              <div className="mt-1 text-xs text-slate-500">Archived • {archivedDate}</div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <a
              href={mapHref}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm border border-gray-200/70 transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105 active:scale-95"
              title="View on map"
            >
              <span className="text-base transition-transform duration-200 group-hover:rotate-12 group-active:rotate-0">
                📍
              </span>
              Map
            </a>

            {phoneHref ? (
              <a
                href={phoneHref}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm border border-gray-200/70 transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105 active:scale-95"
                title="Call broker"
              >
                <span className="text-base transition-transform duration-200 group-hover:scale-110 group-active:scale-90">
                  📞
                </span>
                Call
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50/60 px-4 py-2 text-sm font-medium text-gray-400 border border-gray-200/50 cursor-not-allowed">
                <span className="text-base">📞</span>
                Call
              </span>
            )}

            {emailHref ? (
              <a
                href={emailHref}
                className="group inline-flex items-center gap-1.5 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm backdrop-blur-sm border border-gray-200/70 transition-all duration-200 hover:bg-white hover:shadow-md hover:scale-105 active:scale-95"
                title="Email broker"
              >
                <span className="text-base transition-transform duration-200 group-hover:-translate-y-0.5 group-active:translate-y-0">
                  ✉️
                </span>
                Email
              </a>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-50/60 px-4 py-2 text-sm font-medium text-gray-400 border border-gray-200/50 cursor-not-allowed">
                <span className="text-base">✉️</span>
                Email
              </span>
            )}

            <Link
              href={`/admin/jobs/${job.id}`}
              className="group inline-flex items-center gap-1.5 rounded-full bg-[#43a419] px-5 py-2.5 text-sm font-medium text-white shadow-md transition-all duration-200 hover:bg-[#3a8f16] hover:shadow-lg hover:scale-105 active:scale-95"
            >
              Console
              <span className="text-base transition-transform duration-200 group-hover:translate-x-1 group-active:translate-x-0">
                →
              </span>
            </Link>

            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm backdrop-blur-sm border border-gray-200/70 hover:bg-white hover:text-gray-900 transition-all duration-200 hover:scale-105 active:scale-95"
                aria-expanded={isMenuOpen}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
                  />
                </svg>
              </button>

              {isMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-72 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/10 backdrop-blur-lg">
                  <div className="py-1">
                    {mode === "active" ? (
                      <>
                        {!optimisticHasLead ? (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openDrawer("create")}
                              className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-[#43a419]/10 hover:text-[#2f7a10] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <span className="text-base">🧲</span>
                              <span className="font-medium">Configure + Post Lead…</span>
                            </button>
                            <div className="my-1 h-px bg-gray-100" />
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => openDrawer("edit")}
                              className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                              <span className="text-base">✏️</span>
                              <span className="font-medium">Edit Lead…</span>
                            </button>

                            <button
                              type="button"
                              disabled={isPending}
                              onClick={removeLead}
                              className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-red-700 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              <span className="text-base">🗑️</span>
                              <span className="font-medium">Remove Lead</span>
                            </button>

                            <div className="my-1 h-px bg-gray-100" />
                          </>
                        )}
                      </>
                    ) : null}

                    {mode === "active" ? (
                      <form action={archiveJobAction}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <button
                          type="submit"
                          onClick={() => setIsMenuOpen(false)}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-base">📦</span>
                          Archive Job
                        </button>
                      </form>
                    ) : (
                      <form action={unarchiveJobAction}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <button
                          type="submit"
                          onClick={() => setIsMenuOpen(false)}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-base">♻️</span>
                          Unarchive
                        </button>
                      </form>
                    )}
                  </div>

                  {mode === "archived" && (
                    <div className="py-2 border-t border-gray-100">
                      <div className="px-4 py-2 text-xs text-red-600 font-medium">Danger zone</div>
                      <form action={hardDeleteJobAction} className="px-4 py-2">
                        <input type="hidden" name="job_id" value={job.id} />
                        <div className="flex items-center gap-2">
                          <input
                            name="confirm"
                            placeholder='Type "DELETE"'
                            className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
                            autoComplete="off"
                          />
                          <button
                            type="submit"
                            onClick={() => setIsMenuOpen(false)}
                            className="rounded-md bg-red-50 px-4 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right-side Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => !isPending && setDrawerOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-full sm:w-[520px] bg-white shadow-2xl border-l border-slate-200 flex flex-col">
            <div className="p-5 border-b border-slate-200">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-slate-500">Lead Settings</div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    {drawerMode === "create" ? "Configure + Post Lead" : "Edit Lead"}
                  </h2>
                  <div className="mt-1 text-sm text-slate-600">{addrLine(job)}</div>
                </div>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-5 overflow-auto flex-1 space-y-5">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-slate-900">Price (USD)</label>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-slate-500">$</span>
                  <input
                    value={priceDollars}
                    onChange={(e) => setPriceDollars(e.target.value)}
                    placeholder="99.00"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                  />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Stored as cents in the database.
                </div>
              </div>

              {/* Expiration */}
              <div>
                <label className="block text-sm font-medium text-slate-900">Expiration</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                />
                <div className="mt-1 text-xs text-slate-500">
                  Leave blank for no expiration.
                </div>
              </div>

              {/* System */}
              <div>
                <label className="block text-sm font-medium text-slate-900">System (optional)</label>
                <select
                  value={systemId}
                  onChange={(e) => setSystemId(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                >
                  <option value="">— None —</option>
                  {systemOptions.length ? (
                    systemOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      (no systems provided)
                    </option>
                  )}
                </select>
              </div>

              {/* Assignment */}
              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900">Assign to contractor</div>
                    <div className="text-xs text-slate-500">
                      If assigned-only is enabled, only that contractor sees it on their board.
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={assignedOnly}
                      onChange={(e) => setAssignedOnly(e.target.checked)}
                      className="h-4 w-4"
                    />
                    Assigned only
                  </label>
                </div>

                <select
                  value={assignedContractorId}
                  onChange={(e) => setAssignedContractorId(e.target.value)}
                  className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                >
                  <option value="">— No specific contractor —</option>
                  {contractorOptions.length ? (
                    contractorOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      (no contractors provided)
                    </option>
                  )}
                </select>

                {assignedOnly && !assignedContractorId ? (
                  <div className="mt-2 text-xs text-amber-700">
                    Assigned-only is ON, but no contractor is selected — this lead will be hidden.
                  </div>
                ) : null}
              </div>

              {/* Optional overrides */}
              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Title override (optional)
                </label>
                <input
                  value={titleOverride}
                  onChange={(e) => setTitleOverride(e.target.value)}
                  placeholder="Leave blank to use default"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900">
                  Summary override (optional)
                </label>
                <textarea
                  value={summaryOverride}
                  onChange={(e) => setSummaryOverride(e.target.value)}
                  placeholder="Leave blank to use default"
                  rows={4}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#43a419]/30"
                />
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-white">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setDrawerOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={isPending}
                  onClick={submitDrawer}
                  className="rounded-xl bg-[#43a419] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending
                    ? "Saving…"
                    : drawerMode === "create"
                    ? "Post Lead"
                    : "Save Changes"}
                </button>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                This writes to <code className="font-mono">contractor_leads</code> and refreshes the
                job card from server truth.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

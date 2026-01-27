"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

import {
  archiveJobAction,
  unarchiveJobAction,
  hardDeleteJobAction,
  createLeadFromAdminJobAction,
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

export default function JobCardClient({
  job,
  mode,
  hasLead = false,
}: {
  job: BrokerJob;
  mode: "active" | "archived";
  hasLead?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Optimistic UI: flips to posted immediately on click
  const [optimisticHasLead, setOptimisticHasLead] = useState<boolean>(hasLead);

  // Keep optimistic state in sync with server truth when it updates
  useEffect(() => {
    setOptimisticHasLead(hasLead);
  }, [hasLead]);

  const outs = outputsFromRequested(job.requested_outputs);
  const p = job.intake_payload || {};

  const brokerName = safeStr(
    p.broker_name || p.agent_name || p.realtor_name || p.broker?.name || "Broker"
  );

  const mapHref = makeMapHref(job);
  const phoneHref = makePhoneHref(job);
  const emailHref = makeEmailHref(job);

  const archivedDate = fmtArchivedAt(job.archived_at);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    // ✅ IMPORTANT: no overflow-hidden here, or dropdown will be clipped
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h3 className="text-lg font-semibold tracking-tight truncate">{brokerName}</h3>

              {statusPill(job.response_status)}
              {outs.snapshot && outputChip("Snapshot", true)}
              {outs.inspection && outputChip("Inspection", false)}
              {outs.hes && outputChip("HES", false)}

              {/* ✅ card pill */}
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
                onClick={() => setIsOpen(!isOpen)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm backdrop-blur-sm border border-gray-200/70 hover:bg-white hover:text-gray-900 transition-all duration-200 hover:scale-105 active:scale-95"
                aria-expanded={isOpen}
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

              {isOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-60 origin-top-right rounded-xl bg-white shadow-2xl ring-1 ring-black/10 backdrop-blur-lg transition-all duration-150">
                  <div className="py-1">
                    {/* ✅ Lead menu item (hover + posted state) */}
                    {mode === "active" ? (
                      <>
                        {!optimisticHasLead ? (
                          <>
                            <form action={createLeadFromAdminJobAction}>
                              <input type="hidden" name="job_id" value={job.id} />
                              <button
                                type="submit"
                                onClick={() => {
                                  // ✅ instant green feedback even before server refresh
                                  setOptimisticHasLead(true);
                                  setIsOpen(false);
                                }}
                                className="
                                  group flex w-full items-center gap-3 px-4 py-3 text-sm
                                  text-gray-700 transition-all
                                  hover:bg-[#43a419]/10 hover:text-[#2f7a10]
                                  active:scale-[0.98]
                                "
                              >
                                <span className="text-base transition-transform group-hover:scale-110">
                                  🧲
                                </span>
                                <span className="font-medium">Create Contractor Lead</span>
                              </button>
                            </form>
                            <div className="my-1 h-px bg-gray-100" />
                          </>
                        ) : (
                          <>
                            <div className="flex w-full items-center gap-3 px-4 py-3 text-sm bg-green-50 text-green-800">
                              <span className="text-base">✅</span>
                              <span className="font-semibold">Lead Posted</span>
                            </div>
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
                          onClick={() => setIsOpen(false)}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="h-5 w-5 text-gray-500 group-hover:text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"
                            />
                          </svg>
                          Archive Job
                        </button>
                      </form>
                    ) : (
                      <form action={unarchiveJobAction}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <button
                          type="submit"
                          onClick={() => setIsOpen(false)}
                          className="group flex w-full items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <svg
                            className="h-5 w-5 text-gray-500 group-hover:text-gray-700"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
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
                            onClick={() => setIsOpen(false)}
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
    </div>
  );
}

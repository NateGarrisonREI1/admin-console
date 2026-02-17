"use client";

import { useState, useTransition } from "react";
import type { AvailableLead, MyLead, ContractorStats } from "./actions";
import { createSystemLeadPurchaseIntent, updateLeadStatus, requestLeadRefund } from "./actions";
import { StatCard, StatusBadge, SystemTypeIcon, systemTypeLabel, PurchaseDialog } from "@/components/dashboard";
import RefundRequestDialog from "@/components/dashboard/RefundRequestDialog";
import type { RefundReasonCategory } from "@/types/stripe";
import {
  ChartBarIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

const GREEN = "#43a419";

function money(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(v);
}

function daysLeft(exp: string | null): number | null {
  if (!exp) return null;
  const ms = new Date(exp).getTime() - Date.now();
  return Number.isNaN(ms) ? null : Math.ceil(ms / 86400000);
}

type SystemFilter = "all" | "water_heater" | "hvac" | "solar";
type ContactedStatus = "new" | "contacted" | "quoted" | "closed" | "lost";

const STATUSES: ContactedStatus[] = ["new", "contacted", "quoted", "closed", "lost"];

function RefundStatusBadge({ status }: { status: string | null }) {
  if (!status) return null;
  const styles: Record<string, string> = {
    pending: "border-amber-200 bg-amber-50 text-amber-700",
    approved: "border-green-200 bg-green-50 text-green-700",
    denied: "border-red-200 bg-red-50 text-red-700",
    more_info_requested: "border-blue-200 bg-blue-50 text-blue-700",
  };
  const labels: Record<string, string> = {
    pending: "Refund Pending",
    approved: "Refund Approved",
    denied: "Refund Denied",
    more_info_requested: "Info Requested",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${styles[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

export default function ContractorDashboardClient({
  available,
  myLeads,
  stats,
}: {
  available: AvailableLead[];
  myLeads: MyLead[];
  stats: ContractorStats;
}) {
  const [filter, setFilter] = useState<SystemFilter>("all");
  const [purchasingLead, setPurchasingLead] = useState<AvailableLead | null>(null);
  const [refundingLead, setRefundingLead] = useState<MyLead | null>(null);
  const [, startTransition] = useTransition();

  const filtered = filter === "all"
    ? available
    : available.filter((l) => l.system_type === filter);

  async function handleCreateIntent() {
    if (!purchasingLead) throw new Error("No lead selected");
    return createSystemLeadPurchaseIntent(purchasingLead.id);
  }

  function handlePurchaseSuccess() {
    window.location.reload();
  }

  function handleStatusChange(statusId: string, newStatus: string) {
    startTransition(async () => {
      await updateLeadStatus(statusId, { status: newStatus });
      window.location.reload();
    });
  }

  async function handleRefundSubmit(data: {
    reason: string;
    reasonCategory: RefundReasonCategory;
    notes?: string;
  }) {
    if (!refundingLead) return;
    await requestLeadRefund(
      refundingLead.system_lead.id,
      data.reason,
      data.reasonCategory,
      data.notes
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Contractor Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Browse system-specific leads, purchase, and track your pipeline.</p>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(["all", "water_heater", "hvac", "solar"] as SystemFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              borderColor: filter === f ? "rgba(67,164,25,0.35)" : "#e5e7eb",
              background: filter === f ? "rgba(67,164,25,0.10)" : "white",
              color: filter === f ? GREEN : "#374151",
            }}
          >
            {f === "all" ? "All Systems" : systemTypeLabel(f)}
          </button>
        ))}
      </div>

      {/* Available Leads Grid */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">
          Available Leads ({filtered.length})
        </h2>
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No leads available for this filter. Check back soon.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lead) => {
              const report = lead.leaf_report_data ?? {};
              const dl = daysLeft(lead.expiration_date);
              const loc = [lead.city, lead.state].filter(Boolean).join(", ");

              return (
                <div key={lead.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
                    <SystemTypeIcon type={lead.system_type as "hvac" | "solar" | "water_heater"} showLabel />
                  </div>
                  <div className="flex-1 space-y-2 p-5">
                    <div className="text-sm font-semibold text-slate-900">{loc || lead.zip}</div>
                    {(report as Record<string, unknown>).estimated_savings_annual != null && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Est. Savings</span>
                        <span className="font-medium text-green-700">
                          ${String((report as Record<string, unknown>).estimated_savings_annual)}/yr
                        </span>
                      </div>
                    )}
                    {(report as Record<string, unknown>).estimated_incentives != null && (
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Incentives</span>
                        <span className="font-medium">
                          ${Number((report as Record<string, unknown>).estimated_incentives).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 px-5 py-3.5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-lg font-bold text-slate-900">{money(lead.price)}</div>
                      {dl != null && dl > 0 && (
                        <div className={`text-xs font-medium ${dl <= 3 ? "text-amber-600" : "text-slate-500"}`}>
                          {dl}d left
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setPurchasingLead(lead)}
                      className="w-full rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-90 transition-colors"
                      style={{ background: GREEN }}
                    >
                      Purchase
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* My Purchased Leads */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">My Purchased Leads</h2>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <StatCard
            label="Total Purchased"
            value={stats.total_purchased}
            icon={<ShoppingCartIcon className="h-5 w-5" />}
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Closed"
            value={stats.closed}
            icon={<CheckCircleIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Conversion"
            value={`${stats.conversion_rate}%`}
            icon={<ArrowTrendingUpIcon className="h-5 w-5" />}
          />
        </div>

        {myLeads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No purchased leads yet. Browse the available leads above to get started.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">System</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeads.map((ml) => {
                    const sl = ml.system_lead;
                    const canRequestRefund = !ml.refund_status && ml.status !== "closed";
                    return (
                      <tr key={ml.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                        <td className="px-4 py-3">
                          <SystemTypeIcon type={sl.system_type as "hvac" | "solar" | "water_heater"} showLabel size="sm" />
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {[sl.city, sl.state].filter(Boolean).join(", ") || sl.zip}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-slate-900">{sl.homeowner_name || "\u2014"}</div>
                          <div className="text-xs text-slate-500">{sl.homeowner_phone || sl.homeowner_email || "\u2014"}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={ml.status} />
                            <RefundStatusBadge status={ml.refund_status} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={ml.status}
                              onChange={(e) => handleStatusChange(ml.id, e.target.value)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 bg-white"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                              ))}
                            </select>
                            {canRequestRefund && (
                              <button
                                onClick={() => setRefundingLead(ml)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-100 transition-colors whitespace-nowrap"
                              >
                                Refund
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Purchase Dialog */}
      {purchasingLead && (
        <PurchaseDialog
          open
          onClose={() => setPurchasingLead(null)}
          onCreateIntent={handleCreateIntent}
          onSuccess={handlePurchaseSuccess}
          title="Purchase Lead"
          description={`${systemTypeLabel(purchasingLead.system_type as "hvac" | "solar" | "water_heater")} lead in ${[purchasingLead.city, purchasingLead.state].filter(Boolean).join(", ") || purchasingLead.zip}. After purchase, you'll get full homeowner contact information.`}
          price={purchasingLead.price}
          itemLabel="system lead"
        />
      )}

      {/* Refund Request Dialog */}
      {refundingLead && (
        <RefundRequestDialog
          open
          onClose={() => setRefundingLead(null)}
          onSubmit={handleRefundSubmit}
          leadAddress={[refundingLead.system_lead.city, refundingLead.system_lead.state].filter(Boolean).join(", ") || refundingLead.system_lead.zip}
          leadSystemType={refundingLead.system_lead.system_type}
          leadPrice={refundingLead.system_lead.price}
        />
      )}
    </div>
  );
}

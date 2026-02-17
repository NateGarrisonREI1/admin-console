"use client";

import { useState, useTransition } from "react";
import type { AvailableHesLead, MyWorkItem, AffiliateStats } from "./actions";
import { createHesLeadPurchaseIntent, markWorkComplete } from "./actions";
import { StatCard, StatusBadge, PurchaseDialog } from "@/components/dashboard";
import {
  ShoppingCartIcon,
  ClockIcon,
  CheckCircleIcon,
  ChartBarIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";

function fmtDate(iso?: string | null) {
  if (!iso) return "\u2014";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "\u2014";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function AffiliateDashboardClient({
  available,
  myWork,
  stats,
}: {
  available: AvailableHesLead[];
  myWork: MyWorkItem[];
  stats: AffiliateStats;
}) {
  const [purchasingLead, setPurchasingLead] = useState<AvailableHesLead | null>(null);
  const [, startTransition] = useTransition();

  async function handleCreateIntent() {
    if (!purchasingLead) throw new Error("No lead selected");
    return createHesLeadPurchaseIntent(purchasingLead.id);
  }

  function handlePurchaseSuccess() {
    window.location.reload();
  }

  function handleMarkComplete(workId: string) {
    startTransition(async () => {
      await markWorkComplete(workId);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">HES Affiliate Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Buy HES leads, complete assessments, and track your performance.
        </p>
      </div>

      {/* Lead Marketplace */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Lead Marketplace</h2>
            <p className="text-sm text-slate-500">{available.length} leads available at $10 each</p>
          </div>
        </div>

        {available.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No HES leads available right now. Check back when brokers submit new requests.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((lead) => (
              <div key={lead.id} className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="flex-1 p-5 space-y-2">
                  <div className="text-sm font-semibold text-slate-900">
                    {lead.city}, {lead.state}
                  </div>
                  <div className="text-xs text-slate-500">{lead.property_address}</div>
                  <div className="text-xs text-slate-500">ZIP: {lead.zip}</div>
                  <div className="flex justify-between text-sm text-slate-600 mt-2">
                    <span>Type</span>
                    <span className="font-medium capitalize">{lead.property_type.replace("_", " ")}</span>
                  </div>
                  {lead.requested_completion_date && (
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Needed by</span>
                      <span className="font-medium">{fmtDate(lead.requested_completion_date)}</span>
                    </div>
                  )}
                </div>
                <div className="border-t border-slate-100 px-5 py-3.5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-bold text-slate-900">$10.00</div>
                  </div>
                  <button
                    onClick={() => setPurchasingLead(lead)}
                    className="w-full rounded-xl bg-[#43a419] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors"
                  >
                    Purchase
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Work */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">My Purchased Leads & Work</h2>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-6">
          <StatCard
            label="Purchased"
            value={stats.total_purchased}
            icon={<ShoppingCartIcon className="h-5 w-5" />}
          />
          <StatCard
            label="In Progress"
            value={stats.in_progress}
            icon={<ClockIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Completed"
            value={stats.completed}
            icon={<CheckCircleIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Completion Rate"
            value={`${stats.completion_rate}%`}
            icon={<ChartBarIcon className="h-5 w-5" />}
          />
          <StatCard
            label="Avg. Completion"
            value={`${stats.avg_completion_days}d`}
            icon={<ArrowPathIcon className="h-5 w-5" />}
          />
        </div>

        {myWork.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-10 text-center text-slate-500">
            No work items yet. Purchase leads from the marketplace above.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Address</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Purchased</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myWork.map((w) => (
                    <tr key={w.id} style={{ borderBottom: "1px solid #f8fafc" }}>
                      <td className="px-4 py-3 font-medium text-slate-900">{w.property_address}</td>
                      <td className="px-4 py-3 text-slate-600">{w.city}, {w.state}</td>
                      <td className="px-4 py-3 text-sm text-slate-500">{fmtDate(w.purchased_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {w.status === "assigned_affiliate" && (
                          <button
                            onClick={() => handleMarkComplete(w.id)}
                            className="rounded-lg border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                          >
                            Mark Complete
                          </button>
                        )}
                        {w.status === "completed" && (
                          <span className="text-xs text-green-600 font-medium">Done</span>
                        )}
                      </td>
                    </tr>
                  ))}
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
          title="Purchase HES Lead"
          description={`HES assessment lead for ${purchasingLead.property_address}, ${purchasingLead.city}, ${purchasingLead.state}. After purchase, you'll receive full property and broker details.`}
          price={purchasingLead.price ?? 10}
          itemLabel="HES lead"
        />
      )}
    </div>
  );
}

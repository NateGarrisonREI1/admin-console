"use client";

import type { SystemLead } from "@/types/schema";
import SystemTypeIcon, { systemTypeLabel } from "./SystemTypeIcon";
import StatusBadge from "./StatusBadge";

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const ms = new Date(dateStr).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / 86400000);
}

type Props = {
  lead: SystemLead;
  showContact?: boolean;
  onPurchase?: () => void;
  onViewDetails?: () => void;
  purchaseDisabled?: boolean;
};

export default function SystemLeadCard({
  lead,
  showContact = false,
  onPurchase,
  onViewDetails,
  purchaseDisabled = false,
}: Props) {
  const daysLeft = daysUntil(lead.expiration_date);
  const location = [lead.city, lead.state].filter(Boolean).join(", ");
  const report = lead.leaf_report_data ?? {};

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-3.5">
        <SystemTypeIcon type={lead.system_type} showLabel />
        <div className="ml-auto">
          <StatusBadge status={lead.status} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-3 p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900">{location || "Location hidden"}</div>
          {lead.zip && <div className="text-xs text-slate-500">ZIP: {lead.zip}</div>}
        </div>

        {/* Report snippets */}
        <div className="space-y-1.5 text-sm">
          {report.current_system_age != null && (
            <div className="flex justify-between text-slate-600">
              <span>Current System</span>
              <span className="font-medium text-slate-900">{report.current_system_age} yrs old</span>
            </div>
          )}
          {report.estimated_savings_annual != null && (
            <div className="flex justify-between text-slate-600">
              <span>Est. Savings</span>
              <span className="font-medium text-green-700">${report.estimated_savings_annual}/yr</span>
            </div>
          )}
          {report.estimated_incentives != null && (
            <div className="flex justify-between text-slate-600">
              <span>Est. Incentives</span>
              <span className="font-medium text-slate-900">${report.estimated_incentives.toLocaleString()}</span>
            </div>
          )}
          {report.roi_years != null && (
            <div className="flex justify-between text-slate-600">
              <span>ROI</span>
              <span className="font-medium text-slate-900">{report.roi_years} years</span>
            </div>
          )}
        </div>

        {/* Contact info (after purchase) */}
        {showContact && lead.homeowner_name && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm">
            <div className="font-semibold text-green-800">Contact Info</div>
            <div className="mt-1 space-y-0.5 text-green-700">
              <div>{lead.homeowner_name}</div>
              {lead.homeowner_phone && <div>{lead.homeowner_phone}</div>}
              {lead.homeowner_email && <div>{lead.homeowner_email}</div>}
              {lead.best_contact_time && (
                <div className="text-xs">Best time: {lead.best_contact_time}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 px-5 py-3.5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-bold text-slate-900">{formatPrice(lead.price)}</div>
          {daysLeft != null && daysLeft > 0 && (
            <div className={`text-xs font-medium ${daysLeft <= 3 ? "text-amber-600" : "text-slate-500"}`}>
              {daysLeft} {daysLeft === 1 ? "day" : "days"} left
            </div>
          )}
          {daysLeft != null && daysLeft <= 0 && (
            <div className="text-xs font-medium text-red-600">Expired</div>
          )}
        </div>

        <div className="flex gap-2">
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              View Details
            </button>
          )}
          {onPurchase && (
            <button
              onClick={onPurchase}
              disabled={purchaseDisabled}
              className="flex-1 rounded-xl bg-[#43a419] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Purchase
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

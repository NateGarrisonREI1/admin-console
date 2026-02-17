"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { RefundReasonCategory } from "@/types/stripe";
import { REFUND_REASON_LABELS } from "@/types/stripe";

type Props = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: {
    reason: string;
    reasonCategory: RefundReasonCategory;
    notes?: string;
  }) => Promise<void>;
  leadAddress: string;
  leadSystemType: string;
  leadPrice: number;
};

const REASON_CATEGORIES: RefundReasonCategory[] = [
  "no_response",
  "competitor",
  "bad_quality",
  "not_interested",
  "duplicate",
  "other",
];

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export default function RefundRequestDialog({
  open,
  onClose,
  onSubmit,
  leadAddress,
  leadSystemType,
  leadPrice,
}: Props) {
  const [category, setCategory] = useState<RefundReasonCategory>("no_response");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        reason: REFUND_REASON_LABELS[category],
        reasonCategory: category,
        notes: notes.trim() || undefined,
      });
      setSuccess(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit refund request");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setCategory("no_response");
    setNotes("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Request Refund</h3>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {success ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-center">
              <p className="font-semibold text-green-800">Refund Request Submitted</p>
              <p className="mt-1 text-sm text-green-700">
                We&apos;ll review your request within 3-5 business days.
              </p>
            </div>
          ) : (
            <>
              {/* Lead details */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Lead</span>
                  <span className="font-medium text-slate-900">{leadAddress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-900 capitalize">{leadSystemType.replace("_", " ")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Purchase Price</span>
                  <span className="font-bold text-slate-900">{formatPrice(leadPrice)}</span>
                </div>
              </div>

              {/* Reason dropdown */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Reason for refund
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as RefundReasonCategory)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white focus:border-[#43a419] focus:ring-1 focus:ring-[#43a419] outline-none"
                >
                  {REASON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {REFUND_REASON_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Additional details (optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Provide any details that may help us review your request..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#43a419] focus:ring-1 focus:ring-[#43a419] outline-none resize-none"
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          {success ? (
            <button
              onClick={handleClose}
              className="flex-1 rounded-xl bg-[#43a419] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors"
            >
              Done
            </button>
          ) : (
            <>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? "Submitting..." : "Request Refund"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

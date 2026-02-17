"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
  price: number;
  itemLabel?: string;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price);
}

export default function PurchaseDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  price,
  itemLabel = "lead",
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      await onConfirm();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Purchase failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          <p className="text-sm text-slate-600">{description}</p>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-600">1x {itemLabel}</span>
              <span className="text-lg font-bold text-slate-900">{formatPrice(price)}</span>
            </div>
            <div className="mt-2 border-t border-slate-200 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-900">Total</span>
                <span className="text-xl font-bold text-slate-900">{formatPrice(price)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-500">
            Payment processing via Stripe will be available soon. For now, purchases are recorded for tracking.
          </p>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-xl bg-[#43a419] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors disabled:opacity-50"
          >
            {loading ? "Processing..." : `Pay ${formatPrice(price)}`}
          </button>
        </div>
      </div>
    </div>
  );
}

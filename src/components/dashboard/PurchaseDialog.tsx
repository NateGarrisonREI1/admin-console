"use client";

import { useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import StripePaymentForm from "./StripePaymentForm";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called to create a Stripe payment intent. Returns the clientSecret. */
  onCreateIntent: () => Promise<{ clientSecret: string }>;
  /** Called after payment succeeds on the client side. */
  onSuccess: () => void;
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
  onCreateIntent,
  onSuccess,
  title,
  description,
  price,
  itemLabel = "lead",
}: Props) {
  const [step, setStep] = useState<"confirm" | "payment">("confirm");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleContinueToPayment() {
    setLoading(true);
    setError(null);
    try {
      const { clientSecret: cs } = await onCreateIntent();
      setClientSecret(cs);
      setStep("payment");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to initialize payment");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setStep("confirm");
    setClientSecret(null);
    setError(null);
    setLoading(false);
    onClose();
  }

  function handlePaymentSuccess() {
    setLoading(false);
    onSuccess();
    handleClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-6">
          {step === "confirm" ? (
            <>
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
                You&apos;ll enter your card details on the next step. Payment is processed securely via Stripe.
              </p>
            </>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-600">Total</span>
                  <span className="text-lg font-bold text-slate-900">{formatPrice(price)}</span>
                </div>
              </div>

              {clientSecret && (
                <StripePaymentForm
                  clientSecret={clientSecret}
                  price={price}
                  onSuccess={handlePaymentSuccess}
                  onError={(msg) => setError(msg)}
                  onLoading={setLoading}
                />
              )}
            </>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-100 px-6 py-4">
          {step === "confirm" ? (
            <>
              <button
                onClick={handleClose}
                disabled={loading}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContinueToPayment}
                disabled={loading}
                className="flex-1 rounded-xl bg-[#43a419] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors disabled:opacity-50"
              >
                {loading ? "Loading..." : "Continue to Payment"}
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setStep("confirm");
                setClientSecret(null);
                setError(null);
              }}
              disabled={loading}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

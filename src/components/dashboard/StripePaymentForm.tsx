"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

const CARD_STYLE = {
  base: {
    fontSize: "16px",
    color: "#1e293b",
    fontFamily: "system-ui, -apple-system, sans-serif",
    "::placeholder": { color: "#94a3b8" },
  },
  invalid: { color: "#dc2626" },
};

type InnerFormProps = {
  clientSecret: string;
  price: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onLoading: (v: boolean) => void;
};

function InnerForm({ clientSecret, price, onSuccess, onError, onLoading }: InnerFormProps) {
  const stripe = useStripe();
  const elements = useElements();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!stripe || !elements) {
      onError("Stripe has not loaded yet. Please try again.");
      return;
    }

    onLoading(true);
    onError("");

    const cardElement = elements.getElement(CardElement);
    if (!cardElement) {
      onError("Card element not found");
      onLoading(false);
      return;
    }

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card: cardElement },
    });

    if (result.error) {
      onError(result.error.message ?? "Payment failed");
      onLoading(false);
    } else if (result.paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      onError("Unexpected payment status. Please try again.");
      onLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <CardElement options={{ style: CARD_STYLE, hidePostalCode: true }} />
      </div>
      <button
        type="submit"
        disabled={!stripe}
        className="w-full rounded-xl bg-[#43a419] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#3a8f16] transition-colors disabled:opacity-50"
      >
        Pay {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)}
      </button>
    </form>
  );
}

type StripePaymentFormProps = {
  clientSecret: string;
  price: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
  onLoading: (v: boolean) => void;
};

export default function StripePaymentForm({
  clientSecret,
  price,
  onSuccess,
  onError,
  onLoading,
}: StripePaymentFormProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (clientSecret) setReady(true);
  }, [clientSecret]);

  if (!ready) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerForm
        clientSecret={clientSecret}
        price={price}
        onSuccess={onSuccess}
        onError={onError}
        onLoading={onLoading}
      />
    </Elements>
  );
}

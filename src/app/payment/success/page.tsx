import { Suspense } from "react";
import PaymentSuccessContent from "./PaymentSuccessContent";

export default function PaymentSuccessPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0f172a",
            color: "#64748b",
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}

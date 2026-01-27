import { Suspense } from "react";
import IntakeClient from "./IntakeClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: 20 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Loading intake…</div>
        </div>
      }
    >
      <IntakeClient />
    </Suspense>
  );
}

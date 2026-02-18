// src/app/(app)/contractor/refunds/page.tsx
export const dynamic = "force-dynamic";

import { supabaseAdmin } from "@/lib/supabase/server";
import { getContractorAuth } from "../_actions/contractor";
import RefundsClient from "./RefundsClient";

export type RefundRequestRow = {
  id: string;
  lead_id: string;
  lead_type: string;
  reason: string;
  reason_category: string;
  status: string;
  requested_date: string;
  reviewed_date: string | null;
  admin_notes: string | null;
  payment: {
    amount: number;
    system_type: string | null;
  };
};

export type RefundsPageData = {
  requests: RefundRequestRow[];
};

const EMPTY_DATA: RefundsPageData = { requests: [] };

async function fetchRefundRequests(): Promise<{ data: RefundsPageData; isAdmin: boolean }> {
  try {
    const auth = await getContractorAuth();
    if (auth.isAdmin) return { data: EMPTY_DATA, isAdmin: true };

    const { data } = await supabaseAdmin
      .from("refund_requests")
      .select(`
        id, lead_id, lead_type, reason, reason_category, status,
        requested_date, reviewed_date, admin_notes,
        payment:payments!inner(amount, system_type)
      `)
      .eq("contractor_id", auth.userId)
      .order("requested_date", { ascending: false });

    const requests = (data ?? []).map((row: Record<string, unknown>) => ({
      ...row,
      payment: Array.isArray(row.payment) ? row.payment[0] : row.payment,
    })) as RefundRequestRow[];

    return { data: { requests }, isAdmin: false };
  } catch {
    return { data: EMPTY_DATA, isAdmin: false };
  }
}

const adminBanner = {
  padding: "10px 20px",
  background: "rgba(59,130,246,0.12)",
  borderBottom: "1px solid rgba(59,130,246,0.25)",
  color: "#93c5fd",
  fontSize: 13,
  fontWeight: 500 as const,
  textAlign: "center" as const,
};

export default async function RefundsPage() {
  const { data, isAdmin } = await fetchRefundRequests();
  return (
    <div>
      {isAdmin && <div style={adminBanner}>Admin Preview — viewing contractor refunds as admin</div>}
      <RefundsClient data={data} />
    </div>
  );
}

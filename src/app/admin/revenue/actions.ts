// src/app/admin/revenue/actions.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { RevenueBreakdown, AdminBrokerSummary } from "@/types/admin-ops";

export type RevenuePageData = {
  breakdown: RevenueBreakdown;
  brokers: AdminBrokerSummary[];
};

export async function fetchRevenueData(): Promise<RevenuePageData> {
  const svc = new AdminOpsService();
  const [breakdown, brokers] = await Promise.all([
    svc.getRevenueBreakdown(),
    svc.getBrokers(),
  ]);
  return { breakdown, brokers };
}

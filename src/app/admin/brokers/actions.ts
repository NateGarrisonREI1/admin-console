// src/app/admin/brokers/actions.ts
"use server";

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { AdminBrokerSummary } from "@/types/admin-ops";

export async function fetchBrokers(): Promise<AdminBrokerSummary[]> {
  const svc = new AdminOpsService();
  return svc.getBrokers();
}

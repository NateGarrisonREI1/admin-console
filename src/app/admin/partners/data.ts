// src/app/admin/partners/data.ts
// Data-fetching for partners — NOT a "use server" module.

import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { PartnerContractor, PartnerDispatch } from "@/types/admin-ops";

const svc = new AdminOpsService();

export async function fetchPartners(): Promise<PartnerContractor[]> {
  return svc.getPartnerContractors();
}

export async function fetchDispatches(): Promise<PartnerDispatch[]> {
  return svc.getPartnerDispatches();
}

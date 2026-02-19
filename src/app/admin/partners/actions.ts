"use server";

import { revalidatePath } from "next/cache";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { PartnerContractor, PartnerDispatch } from "@/types/admin-ops";

const svc = new AdminOpsService();

export async function addPartner(input: {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  partner_type?: string;
  service_types?: string[];
  service_areas?: string[];
  license_number?: string;
}): Promise<PartnerContractor> {
  const partner = await svc.createPartnerContractor(input);
  revalidatePath("/admin/partners");
  revalidatePath("/admin/team");
  return partner;
}

export async function updatePartner(
  id: string,
  updates: Partial<PartnerContractor>
): Promise<PartnerContractor> {
  const partner = await svc.updatePartnerContractor(id, updates);
  revalidatePath("/admin/partners");
  revalidatePath("/admin/team");
  return partner;
}

export async function deletePartner(id: string): Promise<void> {
  await svc.deletePartnerContractor(id);
  revalidatePath("/admin/partners");
  revalidatePath("/admin/team");
}

export async function dispatchToPartner(input: {
  partner_id: string;
  direct_lead_id: string;
  amount_owed?: number;
}): Promise<PartnerDispatch> {
  const dispatch = await svc.createPartnerDispatch(input);
  revalidatePath("/admin/partners");
  revalidatePath("/admin/team");
  revalidatePath("/admin/direct-leads");
  return dispatch;
}

export async function markDispatchPaid(id: string): Promise<PartnerDispatch> {
  const dispatch = await svc.updatePartnerDispatch(id, { payment_status: "paid" });
  revalidatePath("/admin/partners");
  revalidatePath("/admin/team");
  return dispatch;
}

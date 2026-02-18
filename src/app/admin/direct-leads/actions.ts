"use server";

import { revalidatePath } from "next/cache";
import { AdminOpsService } from "@/lib/services/AdminOpsService";
import type { DirectLead, HesTeamMember, InspectorTeamMember, PartnerContractor } from "@/types/admin-ops";

const svc = new AdminOpsService();

export async function fetchDirectLeads(): Promise<DirectLead[]> {
  return svc.getDirectLeads();
}

export async function fetchAssignmentOptions(): Promise<{
  hesMembers: HesTeamMember[];
  inspectors: InspectorTeamMember[];
  partners: PartnerContractor[];
}> {
  const [hesMembers, inspectors, partners] = await Promise.all([
    svc.getHesTeamMembers(),
    svc.getInspectorTeamMembers(),
    svc.getPartnerContractors("active"),
  ]);
  return { hesMembers, inspectors, partners };
}

export async function createDirectLead(input: {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  service_needed?: string[];
  date_needed?: string;
  time_needed?: string;
  budget?: number;
  special_notes?: string;
  source?: string;
}): Promise<DirectLead> {
  const lead = await svc.createDirectLead(input);
  revalidatePath("/admin/direct-leads");
  return lead;
}

export async function assignLead(
  id: string,
  assignedType: string,
  assignedToId: string
): Promise<DirectLead> {
  const lead = await svc.assignDirectLead(id, assignedType, assignedToId);
  revalidatePath("/admin/direct-leads");
  return lead;
}

export async function updateLeadStatus(
  id: string,
  updates: Record<string, unknown>
): Promise<DirectLead> {
  const lead = await svc.updateDirectLead(id, updates);
  revalidatePath("/admin/direct-leads");
  return lead;
}

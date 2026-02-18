"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { BrokerContact, CampaignRecipient } from "@/types/broker";

async function getBroker() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return { svc, broker };
}

export async function fetchContactDetail(
  contactId: string
): Promise<{ contact: BrokerContact; history: CampaignRecipient[] } | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  await svc.getOrCreateBroker(userId);

  try {
    const [contact, history] = await Promise.all([
      svc.getContact(contactId),
      svc.getContactHistory(contactId),
    ]);
    return { contact, history };
  } catch {
    return null;
  }
}

export async function updateContactDetailAction(
  id: string,
  updates: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    status?: string;
    last_contact_date?: string;
    notes?: string;
  }
): Promise<BrokerContact> {
  const { svc } = await getBroker();
  const contact = await svc.updateContact(id, updates as Partial<BrokerContact>);
  revalidatePath(`/broker/contacts/${id}`);
  revalidatePath("/broker/contacts");
  return contact;
}

export async function deleteContactDetailAction(id: string): Promise<void> {
  const { svc } = await getBroker();
  await svc.deleteContact(id);
  revalidatePath("/broker/contacts");
  redirect("/broker/contacts");
}

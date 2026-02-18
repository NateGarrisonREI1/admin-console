"use server";

import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import type { BrokerContact, CsvImportResult } from "@/types/broker";

async function getBroker() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) throw new Error("Not authenticated");
  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return { svc, broker };
}

export async function fetchContacts(): Promise<{
  contacts: BrokerContact[];
} | null> {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const userId = data?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const contacts = await svc.getContacts(broker.id);
  return { contacts };
}

export async function createContactAction(input: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  status?: string;
  last_contact_date?: string;
  notes?: string;
}): Promise<BrokerContact> {
  const { svc, broker } = await getBroker();
  const contact = await svc.createContact({
    broker_id: broker.id,
    name: input.name,
    email: input.email || undefined,
    phone: input.phone || undefined,
    address: input.address || undefined,
    city: input.city || undefined,
    state: input.state || "OR",
    zip: input.zip || undefined,
    status: input.status || "past_customer",
    last_contact_date: input.last_contact_date || undefined,
    notes: input.notes || undefined,
    source: "manual",
  });
  revalidatePath("/broker/contacts");
  return contact;
}

export async function updateContactAction(
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
  revalidatePath("/broker/contacts");
  revalidatePath(`/broker/contacts/${id}`);
  return contact;
}

export async function deleteContactAction(id: string): Promise<void> {
  const { svc } = await getBroker();
  await svc.deleteContact(id);
  revalidatePath("/broker/contacts");
}

export async function importCsvAction(
  rows: {
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
    status?: string;
    last_contact_date?: string;
    notes?: string;
  }[]
): Promise<CsvImportResult> {
  const { svc, broker } = await getBroker();
  const result = await svc.importContactsCsv(
    broker.id,
    rows.map((r) => ({
      broker_id: broker.id,
      name: r.name,
      email: r.email || undefined,
      phone: r.phone || undefined,
      address: r.address || undefined,
      city: r.city || undefined,
      state: r.state || "OR",
      zip: r.zip || undefined,
      status: r.status || "past_customer",
      last_contact_date: r.last_contact_date || undefined,
      notes: r.notes || undefined,
    }))
  );
  revalidatePath("/broker/contacts");
  return result;
}

"use server";

import { supabaseServer } from "@/lib/supabase/server";
import { BrokerService } from "@/lib/services/BrokerService";
import {
  sendBatchCampaignEmails,
  type CampaignEmailInput,
} from "@/lib/services/EmailService";
import type {
  Broker,
  BrokerCampaign,
  BrokerContact,
  CampaignPerformance,
} from "@/types/broker";

// ─── Fetch all campaigns for the authenticated broker ───────────────────────

export type CampaignsPageData = {
  broker: Broker;
  campaigns: BrokerCampaign[];
};

export async function fetchCampaigns(): Promise<CampaignsPageData | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const campaigns = await svc.getCampaigns(broker.id);
  return { broker, campaigns };
}

// ─── Fetch all contacts for recipient selection ─────────────────────────────

export type CampaignContactsData = {
  broker: Broker;
  contacts: BrokerContact[];
};

export async function fetchCampaignContacts(): Promise<CampaignContactsData | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  const contacts = await svc.getContacts(broker.id);
  return { broker, contacts };
}

// ─── Create a new campaign (draft) ──────────────────────────────────────────

export async function createCampaignAction(input: {
  name: string;
  subject?: string;
  message?: string;
}): Promise<BrokerCampaign | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);
  return svc.createCampaign({
    broker_id: broker.id,
    name: input.name,
    subject: input.subject,
    message: input.message,
  });
}

// ─── Send a campaign + trigger batch emails ─────────────────────────────────

export async function sendCampaignAction(
  campaignId: string,
  contactIds: string[],
): Promise<{ queued: number; emailsSent: number; emailsFailed: number } | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  const broker = await svc.getOrCreateBroker(userId);

  // 1. Queue recipients in the DB and update campaign status
  const { queued } = await svc.sendCampaign(campaignId, contactIds);

  // 2. Fetch the campaign for subject + message
  const campaign = await svc.getCampaign(campaignId);

  // 3. Fetch contacts with valid emails for sending
  const contacts = await svc.getContacts(broker.id);
  const contactMap = new Map<string, BrokerContact>();
  for (const c of contacts) {
    contactMap.set(c.id, c);
  }

  // 4. Fetch the newly-created recipients
  const recipients = await svc.getCampaignRecipients(campaignId);

  // 5. Build email inputs
  const emailInputs: CampaignEmailInput[] = [];
  for (const r of recipients) {
    if (!r.email) continue;
    const contact = contactMap.get(r.contact_id);
    emailInputs.push({
      to: r.email,
      recipientName: contact?.name ?? "Homeowner",
      brokerName: broker.company_name ?? "Your Broker",
      subject: campaign.subject ?? "Your Home Energy Assessment is Ready",
      message: campaign.message ?? "",
      recipientId: r.id,
    });
  }

  // 6. Send batch emails
  const { sent: emailsSent, failed: emailsFailed } =
    await sendBatchCampaignEmails(emailInputs);

  return { queued, emailsSent, emailsFailed };
}

// ─── Fetch a single campaign's performance ──────────────────────────────────

export async function fetchCampaignDetail(
  campaignId: string,
): Promise<CampaignPerformance | null> {
  const supabase = await supabaseServer();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData?.user?.id;
  if (!userId) return null;

  const svc = new BrokerService();
  // Validate the broker exists (auth guard)
  await svc.getOrCreateBroker(userId);
  return svc.getCampaignPerformance(campaignId);
}

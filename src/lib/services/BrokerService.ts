// src/lib/services/BrokerService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import { NotFoundError, InternalError, ValidationError } from "./errors";
import type {
  Broker,
  BrokerContractor,
  BrokerContractorInsert,
  BrokerAssessment,
  BrokerAssessmentInsert,
  BrokerLead,
  BrokerLeadInsert,
  BrokerKPIs,
  BrokerAnalytics,
  BrokerContact,
  BrokerContactInsert,
  BrokerCampaign,
  BrokerCampaignInsert,
  CampaignRecipient,
  CsvImportResult,
  CampaignPerformance,
} from "@/types/broker";

export class BrokerService {
  // ──────────────────────────────────────────
  // BROKER PROFILE
  // ──────────────────────────────────────────

  async getOrCreateBroker(userId: string): Promise<Broker> {
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new InternalError(error.message);
    if (data) return data as Broker;

    // Auto-create broker profile
    const { data: created, error: e2 } = await supabaseAdmin
      .from("brokers")
      .insert({ user_id: userId })
      .select()
      .single();

    if (e2) throw new InternalError(e2.message);
    return created as Broker;
  }

  async updateBroker(brokerId: string, updates: Partial<Broker>): Promise<Broker> {
    const { id: _id, user_id: _uid, created_at: _ca, updated_at: _ua, ...safe } = updates as any;
    const { data, error } = await supabaseAdmin
      .from("brokers")
      .update(safe)
      .eq("id", brokerId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as Broker;
  }

  // ──────────────────────────────────────────
  // CONTRACTORS
  // ──────────────────────────────────────────

  async getContractors(brokerId: string, status?: string, providerType?: string): Promise<BrokerContractor[]> {
    let query = supabaseAdmin
      .from("broker_contractors")
      .select("*")
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);
    if (providerType && providerType !== "all") query = query.eq("provider_type", providerType);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as BrokerContractor[];
  }

  async getContractor(id: string): Promise<BrokerContractor> {
    const { data, error } = await supabaseAdmin
      .from("broker_contractors")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Contractor", id);
    return data as BrokerContractor;
  }

  async createContractor(input: BrokerContractorInsert): Promise<BrokerContractor> {
    if (!input.contractor_name?.trim()) throw new ValidationError("Contractor name is required");

    const { data, error } = await supabaseAdmin
      .from("broker_contractors")
      .insert({
        broker_id: input.broker_id,
        contractor_name: input.contractor_name.trim(),
        contractor_email: input.contractor_email?.trim() || null,
        contractor_phone: input.contractor_phone?.trim() || null,
        provider_type: input.provider_type ?? "contractor",
        service_types: input.service_types ?? [],
        service_areas: input.service_areas ?? [],
        lead_cost_override: input.lead_cost_override ?? null,
        commission_split_override: input.commission_split_override ?? null,
        notes: input.notes?.trim() || null,
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerContractor;
  }

  async updateContractor(id: string, updates: Partial<BrokerContractor>): Promise<BrokerContractor> {
    const { id: _id, broker_id: _bid, created_at: _ca, updated_at: _ua, ...safe } = updates as any;
    const { data, error } = await supabaseAdmin
      .from("broker_contractors")
      .update(safe)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerContractor;
  }

  async removeContractor(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("broker_contractors")
      .update({ status: "removed" })
      .eq("id", id);

    if (error) throw new InternalError(error.message);
  }

  // ──────────────────────────────────────────
  // ASSESSMENTS
  // ──────────────────────────────────────────

  async getAssessments(brokerId: string, status?: string): Promise<BrokerAssessment[]> {
    let query = supabaseAdmin
      .from("broker_assessments")
      .select("*")
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as BrokerAssessment[];
  }

  async getAssessment(id: string): Promise<BrokerAssessment> {
    const { data, error } = await supabaseAdmin
      .from("broker_assessments")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Assessment", id);
    return data as BrokerAssessment;
  }

  async createAssessment(input: BrokerAssessmentInsert): Promise<BrokerAssessment> {
    if (!input.customer_name?.trim()) throw new ValidationError("Customer name is required");

    const { data, error } = await supabaseAdmin
      .from("broker_assessments")
      .insert({
        broker_id: input.broker_id,
        customer_name: input.customer_name.trim(),
        customer_email: input.customer_email?.trim() || null,
        customer_phone: input.customer_phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "OR",
        zip: input.zip?.trim() || null,
        status: "not_started",
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerAssessment;
  }

  // ──────────────────────────────────────────
  // LEADS
  // ──────────────────────────────────────────

  async getLeads(brokerId: string, status?: string): Promise<BrokerLead[]> {
    let query = supabaseAdmin
      .from("broker_leads")
      .select("*, assessment:broker_assessments(*), contractor:broker_contractors!purchased_by_contractor_id(*), assigned_provider:broker_contractors!assigned_to_provider_id(*)")
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });

    if (status && status !== "all") query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as BrokerLead[];
  }

  async getLead(id: string): Promise<BrokerLead> {
    const { data, error } = await supabaseAdmin
      .from("broker_leads")
      .select("*, assessment:broker_assessments(*), contractor:broker_contractors!purchased_by_contractor_id(*), assigned_provider:broker_contractors!assigned_to_provider_id(*)")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Lead", id);
    return data as BrokerLead;
  }

  async postLead(input: BrokerLeadInsert): Promise<BrokerLead> {
    if (!input.system_type?.trim()) throw new ValidationError("System type is required");
    if (!input.price || input.price <= 0) throw new ValidationError("Price must be positive");

    const expDate = input.expiration_date
      ? input.expiration_date
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabaseAdmin
      .from("broker_leads")
      .insert({
        broker_id: input.broker_id,
        assessment_id: input.assessment_id || null,
        lead_type: input.lead_type || "system_lead",
        system_type: input.system_type.trim(),
        description: input.description?.trim() || null,
        price: input.price,
        visibility: input.visibility || "network",
        assigned_to_provider_id: input.assigned_to_provider_id || null,
        expiration_date: expDate,
        notes: input.notes?.trim() || null,
        status: "active",
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerLead;
  }

  async updateLead(id: string, updates: Partial<BrokerLead>): Promise<BrokerLead> {
    const { id: _id, broker_id: _bid, created_at: _ca, updated_at: _ua, assessment: _a, contractor: _c, ...safe } = updates as any;
    const { data, error } = await supabaseAdmin
      .from("broker_leads")
      .update(safe)
      .eq("id", id)
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerLead;
  }

  async markLeadClosed(id: string, brokerId: string): Promise<BrokerLead> {
    // Get broker's commission split
    const { data: broker } = await supabaseAdmin
      .from("brokers")
      .select("commission_split_percent")
      .eq("id", brokerId)
      .single();

    const { data: lead } = await supabaseAdmin
      .from("broker_leads")
      .select("price, purchased_by_contractor_id")
      .eq("id", id)
      .single();

    const splitPct = (broker as any)?.commission_split_percent ?? 30;
    const commission = ((lead as any)?.price ?? 0) * (splitPct / 100);

    const { data, error } = await supabaseAdmin
      .from("broker_leads")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        broker_commission: commission,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerLead;
  }

  async deleteLead(id: string): Promise<void> {
    const { error } = await supabaseAdmin
      .from("broker_leads")
      .delete()
      .eq("id", id);

    if (error) throw new InternalError(error.message);
  }

  // ──────────────────────────────────────────
  // DASHBOARD KPIs
  // ──────────────────────────────────────────

  async getDashboardKPIs(brokerId: string): Promise<BrokerKPIs> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [assessments, leads, contractors] = await Promise.all([
      supabaseAdmin
        .from("broker_assessments")
        .select("id", { count: "exact" })
        .eq("broker_id", brokerId)
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("broker_leads")
        .select("id, status, price, broker_commission")
        .eq("broker_id", brokerId)
        .gte("created_at", thirtyDaysAgo),
      supabaseAdmin
        .from("broker_contractors")
        .select("id", { count: "exact" })
        .eq("broker_id", brokerId)
        .eq("status", "active"),
    ]);

    const allLeads = (leads.data ?? []) as any[];
    const posted = allLeads.length;
    const sold = allLeads.filter((l) => l.status === "sold" || l.status === "in_progress" || l.status === "closed").length;
    const closed = allLeads.filter((l) => l.status === "closed").length;
    const revenue = allLeads.reduce((sum, l) => sum + (l.broker_commission ?? 0), 0);
    const totalPrice = allLeads.reduce((sum, l) => sum + (l.price ?? 0), 0);

    return {
      homes_assessed: assessments.count ?? 0,
      revenue,
      leads_posted: posted,
      leads_sold: sold,
      jobs_closed: closed,
      conversion_rate: posted > 0 ? Math.round((closed / posted) * 100) : 0,
      avg_lead_price: posted > 0 ? Math.round(totalPrice / posted) : 0,
      active_contractors: contractors.count ?? 0,
    };
  }

  // ──────────────────────────────────────────
  // ANALYTICS
  // ──────────────────────────────────────────

  async getAnalytics(brokerId: string): Promise<BrokerAnalytics> {
    const kpis = await this.getDashboardKPIs(brokerId);

    // Leads by system type
    const { data: leadsData } = await supabaseAdmin
      .from("broker_leads")
      .select("system_type")
      .eq("broker_id", brokerId);

    const systemCounts: Record<string, number> = {};
    for (const l of (leadsData ?? []) as any[]) {
      const st = l.system_type || "other";
      systemCounts[st] = (systemCounts[st] || 0) + 1;
    }
    const leads_by_system = Object.entries(systemCounts).map(([system_type, count]) => ({ system_type, count }));

    // Top contractors
    const { data: contractorLeads } = await supabaseAdmin
      .from("broker_leads")
      .select("purchased_by_contractor_id, status, broker_commission")
      .eq("broker_id", brokerId)
      .not("purchased_by_contractor_id", "is", null);

    const contractorMap: Record<string, { leads: number; closed: number; revenue: number }> = {};
    for (const l of (contractorLeads ?? []) as any[]) {
      const cid = l.purchased_by_contractor_id;
      if (!cid) continue;
      if (!contractorMap[cid]) contractorMap[cid] = { leads: 0, closed: 0, revenue: 0 };
      contractorMap[cid].leads++;
      if (l.status === "closed") {
        contractorMap[cid].closed++;
        contractorMap[cid].revenue += l.broker_commission ?? 0;
      }
    }

    const contractorIds = Object.keys(contractorMap);
    let contractorNames: Record<string, string> = {};
    if (contractorIds.length > 0) {
      const { data: names } = await supabaseAdmin
        .from("broker_contractors")
        .select("id, contractor_name")
        .in("id", contractorIds);
      for (const n of (names ?? []) as any[]) contractorNames[n.id] = n.contractor_name;
    }

    const top_contractors = Object.entries(contractorMap)
      .map(([id, stats]) => ({
        id,
        name: contractorNames[id] || "Unknown",
        leads_sent: stats.leads,
        jobs_closed: stats.closed,
        conversion_rate: stats.leads > 0 ? Math.round((stats.closed / stats.leads) * 100) : 0,
        revenue: stats.revenue,
      }))
      .sort((a, b) => b.jobs_closed - a.jobs_closed)
      .slice(0, 10);

    return {
      kpis,
      revenue_by_month: [],
      leads_by_system,
      top_contractors,
    };
  }

  // ──────────────────────────────────────────
  // CONTACTS
  // ──────────────────────────────────────────

  async getContacts(brokerId: string, opts?: { status?: string; search?: string }): Promise<BrokerContact[]> {
    let query = supabaseAdmin
      .from("broker_contacts")
      .select("*")
      .eq("broker_id", brokerId)
      .order("name");

    if (opts?.status && opts.status !== "all") query = query.eq("status", opts.status);
    if (opts?.search) query = query.or(`name.ilike.%${opts.search}%,email.ilike.%${opts.search}%`);

    const { data, error } = await query;
    if (error) throw new InternalError(error.message);
    return (data ?? []) as BrokerContact[];
  }

  async getContact(id: string): Promise<BrokerContact> {
    const { data, error } = await supabaseAdmin
      .from("broker_contacts")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("Contact", id);
    return data as BrokerContact;
  }

  async createContact(input: BrokerContactInsert): Promise<BrokerContact> {
    if (!input.name?.trim()) throw new ValidationError("Name is required");

    const { data, error } = await supabaseAdmin
      .from("broker_contacts")
      .insert({
        broker_id: input.broker_id,
        name: input.name.trim(),
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        city: input.city?.trim() || null,
        state: input.state?.trim() || "OR",
        zip: input.zip?.trim() || null,
        status: input.status || "past_customer",
        last_contact_date: input.last_contact_date || null,
        notes: input.notes?.trim() || null,
        source: input.source || "manual",
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerContact;
  }

  async updateContact(id: string, updates: Partial<BrokerContact>): Promise<BrokerContact> {
    const { id: _id, broker_id: _bid, created_at: _ca, updated_at: _ua, ...safe } = updates as Record<string, unknown>;
    (safe as Record<string, unknown>).updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from("broker_contacts")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as BrokerContact;
  }

  async deleteContact(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from("broker_contacts").delete().eq("id", id);
    if (error) throw new InternalError(error.message);
  }

  async importContactsCsv(brokerId: string, rows: BrokerContactInsert[]): Promise<CsvImportResult> {
    let imported = 0;
    let duplicates = 0;
    let invalid = 0;
    const errors: string[] = [];

    // Get existing emails for dedup
    const { data: existing } = await supabaseAdmin
      .from("broker_contacts")
      .select("email")
      .eq("broker_id", brokerId);
    const existingEmails = new Set((existing ?? []).map((r: { email: string | null }) => r.email?.toLowerCase()).filter(Boolean));

    const toInsert: Record<string, unknown>[] = [];
    const seenEmails = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (!row.name?.trim()) {
        invalid++;
        errors.push(`Row ${i + 1}: Missing name`);
        continue;
      }

      const email = row.email?.trim().toLowerCase() || null;
      if (email) {
        // Basic email validation
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          invalid++;
          errors.push(`Row ${i + 1}: Invalid email "${email}"`);
          continue;
        }
        if (existingEmails.has(email) || seenEmails.has(email)) {
          duplicates++;
          continue;
        }
        seenEmails.add(email);
      }

      toInsert.push({
        broker_id: brokerId,
        name: row.name.trim(),
        email: email,
        phone: row.phone?.trim() || null,
        address: row.address?.trim() || null,
        city: row.city?.trim() || null,
        state: row.state?.trim() || "OR",
        zip: row.zip?.trim() || null,
        status: row.status || "past_customer",
        last_contact_date: row.last_contact_date || null,
        notes: row.notes?.trim() || null,
        source: "csv_import",
      });
    }

    if (toInsert.length > 0) {
      // Insert in batches of 100
      for (let i = 0; i < toInsert.length; i += 100) {
        const batch = toInsert.slice(i, i + 100);
        const { error } = await supabaseAdmin.from("broker_contacts").insert(batch);
        if (error) {
          errors.push(`Batch insert error: ${error.message}`);
        } else {
          imported += batch.length;
        }
      }
    }

    return { imported, duplicates, invalid, errors };
  }

  // ──────────────────────────────────────────
  // CAMPAIGNS
  // ──────────────────────────────────────────

  async getCampaigns(brokerId: string): Promise<BrokerCampaign[]> {
    const { data, error } = await supabaseAdmin
      .from("broker_campaigns")
      .select("*")
      .eq("broker_id", brokerId)
      .order("created_at", { ascending: false });
    if (error) throw new InternalError(error.message);
    return (data ?? []) as BrokerCampaign[];
  }

  async getCampaign(id: string): Promise<BrokerCampaign> {
    const { data, error } = await supabaseAdmin
      .from("broker_campaigns")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) throw new NotFoundError("Campaign", id);
    return data as BrokerCampaign;
  }

  async createCampaign(input: BrokerCampaignInsert): Promise<BrokerCampaign> {
    if (!input.name?.trim()) throw new ValidationError("Campaign name is required");

    const { data, error } = await supabaseAdmin
      .from("broker_campaigns")
      .insert({
        broker_id: input.broker_id,
        name: input.name.trim(),
        subject: input.subject?.trim() || "Your Home Energy Assessment is Ready",
        message: input.message?.trim() || null,
        target_count: input.target_count ?? 0,
        status: "draft",
      })
      .select()
      .single();

    if (error) throw new InternalError(error.message);
    return data as BrokerCampaign;
  }

  async updateCampaign(id: string, updates: Partial<BrokerCampaign>): Promise<BrokerCampaign> {
    const { id: _id, broker_id: _bid, created_at: _ca, updated_at: _ua, ...safe } = updates as Record<string, unknown>;
    const { data, error } = await supabaseAdmin
      .from("broker_campaigns")
      .update(safe)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new InternalError(error.message);
    return data as BrokerCampaign;
  }

  async sendCampaign(campaignId: string, contactIds: string[]): Promise<{ queued: number }> {
    // Get campaign
    const campaign = await this.getCampaign(campaignId);
    if (campaign.status === "sent") throw new ValidationError("Campaign already sent");

    // Get contacts with emails
    const { data: contacts, error: cErr } = await supabaseAdmin
      .from("broker_contacts")
      .select("id, email")
      .in("id", contactIds)
      .not("email", "is", null);
    if (cErr) throw new InternalError(cErr.message);

    const validContacts = (contacts ?? []).filter((c: { id: string; email: string | null }) => c.email);

    // Create recipient records
    const recipientRows = validContacts.map((c: { id: string; email: string | null }) => ({
      campaign_id: campaignId,
      contact_id: c.id,
      email: c.email,
      status: "queued",
    }));

    if (recipientRows.length > 0) {
      // Insert in batches
      for (let i = 0; i < recipientRows.length; i += 100) {
        const batch = recipientRows.slice(i, i + 100);
        await supabaseAdmin.from("campaign_recipients").insert(batch);
      }
    }

    // Update campaign status
    await supabaseAdmin
      .from("broker_campaigns")
      .update({
        status: "sending",
        target_count: contactIds.length,
        sent_count: validContacts.length,
        sent_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", campaignId);

    // Mark as sent (email sending will be handled by the email service / queue)
    await supabaseAdmin
      .from("broker_campaigns")
      .update({ status: "sent" })
      .eq("id", campaignId);

    // Update all recipients to "sent"
    await supabaseAdmin
      .from("campaign_recipients")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("campaign_id", campaignId)
      .eq("status", "queued");

    return { queued: validContacts.length };
  }

  async getCampaignPerformance(campaignId: string): Promise<CampaignPerformance> {
    const campaign = await this.getCampaign(campaignId);

    const { data: recipients, error } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*, contact:broker_contacts(*)")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });

    if (error) throw new InternalError(error.message);

    const recs = (recipients ?? []) as CampaignRecipient[];
    const sent = recs.length;
    const delivered = recs.filter((r) => r.status !== "queued").length;
    const opened = recs.filter((r) => r.opened_at).length;
    const clicked = recs.filter((r) => r.clicked_at).length;
    const completed = recs.filter((r) => r.completed_at).length;
    const hes_requested = recs.filter((r) => r.hes_requested_at).length;

    return {
      campaign,
      recipients: recs,
      funnel: { sent, delivered, opened, clicked, completed, hes_requested },
      rates: {
        open_rate: sent > 0 ? Math.round((opened / sent) * 100) : 0,
        click_rate: opened > 0 ? Math.round((clicked / opened) * 100) : 0,
        completion_rate: sent > 0 ? Math.round((completed / sent) * 100) : 0,
        hes_rate: sent > 0 ? Math.round((hes_requested / sent) * 100) : 0,
      },
    };
  }

  async getCampaignRecipients(campaignId: string): Promise<CampaignRecipient[]> {
    const { data, error } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*, contact:broker_contacts(*)")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: false });
    if (error) throw new InternalError(error.message);
    return (data ?? []) as CampaignRecipient[];
  }

  // Get contact communication history (campaigns they were part of)
  async getContactHistory(contactId: string): Promise<CampaignRecipient[]> {
    const { data, error } = await supabaseAdmin
      .from("campaign_recipients")
      .select("*, campaign:broker_campaigns(*)")
      .eq("contact_id", contactId)
      .order("created_at", { ascending: false });
    if (error) throw new InternalError(error.message);
    return (data ?? []) as unknown as CampaignRecipient[];
  }
}

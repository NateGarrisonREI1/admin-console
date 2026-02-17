// src/lib/services/LeadService.ts
import { supabaseAdmin } from "@/lib/supabase/server";
import {
  NotFoundError,
  ValidationError,
  ConflictError,
  InternalError,
} from "./errors";
import type {
  LeadDTO,
  LeadFilters,
  LeadUpdateDTO,
  Paginated,
} from "./types";
import type { LeadStatus, BuyerType } from "@/types/schema";

const VALID_STATUSES: LeadStatus[] = ["draft", "active", "sold", "expired", "canceled"];
const VALID_BUYER_TYPES: BuyerType[] = ["contractor", "broker", "other"];

export class LeadService {
  /** Create a new lead from a job. Starts in "draft" status. */
  async createLead(
    jobId: string,
    price: number,
    opts?: { notes?: string; service_tags?: string[] }
  ): Promise<LeadDTO> {
    if (!jobId) throw new ValidationError("job_id is required");
    if (price < 0) throw new ValidationError("price must be non-negative");

    // Verify job exists
    const { data: job } = await supabaseAdmin
      .from("admin_jobs")
      .select("id")
      .eq("id", jobId)
      .single();

    if (!job) throw new NotFoundError("Job", jobId);

    const { data, error } = await supabaseAdmin
      .from("leads")
      .insert({
        admin_job_id: jobId,
        status: "draft",
        price,
        notes: opts?.notes ?? null,
        service_tags: opts?.service_tags ?? [],
      })
      .select()
      .single();

    if (error) {
      console.error("LeadService.createLead error:", error);
      throw new InternalError(error.message);
    }

    return data as LeadDTO;
  }

  /** Post a draft lead for sale (status -> active, posted_at -> now). */
  async postForSale(leadId: string): Promise<LeadDTO> {
    const lead = await this.getLead(leadId);

    if (lead.status !== "draft") {
      throw new ConflictError(`Cannot post lead with status "${lead.status}". Must be "draft".`);
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({
        status: "active",
        posted_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    return data as LeadDTO;
  }

  /** List leads with optional filters and pagination. */
  async getLeads(filters: LeadFilters = {}): Promise<Paginated<LeadDTO>> {
    const page = Math.max(1, filters.page ?? 1);
    const perPage = Math.min(100, Math.max(1, filters.per_page ?? 25));
    const offset = (page - 1) * perPage;

    let query = supabaseAdmin
      .from("leads")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + perPage - 1);

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.job_id) query = query.eq("admin_job_id", filters.job_id);
    if (filters.price_min != null) query = query.gte("price", filters.price_min);
    if (filters.price_max != null) query = query.lte("price", filters.price_max);
    if (filters.posted_after) query = query.gte("posted_at", filters.posted_after);
    if (filters.posted_before) query = query.lte("posted_at", filters.posted_before);

    const { data, error, count } = await query;

    if (error) {
      console.error("LeadService.getLeads error:", error);
      throw new InternalError(error.message);
    }

    return {
      items: (data ?? []) as LeadDTO[],
      total: count ?? 0,
      page,
      per_page: perPage,
    };
  }

  /** Get a single lead by ID. */
  async getLead(id: string): Promise<LeadDTO> {
    const { data, error } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) throw new NotFoundError("Lead", id);

    return data as LeadDTO;
  }

  /**
   * Record a lead purchase. Sets buyer, status -> sold, sold_at -> now.
   * Only active leads can be purchased.
   */
  async purchaseLead(
    leadId: string,
    buyerId: string,
    buyerType: BuyerType = "contractor"
  ): Promise<LeadDTO> {
    const lead = await this.getLead(leadId);

    if (lead.status !== "active") {
      throw new ConflictError(`Cannot purchase lead with status "${lead.status}". Must be "active".`);
    }
    if (lead.buyer_id) {
      throw new ConflictError("Lead has already been purchased");
    }
    if (!VALID_BUYER_TYPES.includes(buyerType)) {
      throw new ValidationError(`Invalid buyer_type. Must be one of: ${VALID_BUYER_TYPES.join(", ")}`);
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update({
        status: "sold",
        buyer_id: buyerId,
        buyer_type: buyerType,
        sold_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .select()
      .single();

    if (error) throw new InternalError(error.message);

    return data as LeadDTO;
  }

  /** Update a lead's mutable fields. */
  async updateLead(id: string, updates: LeadUpdateDTO): Promise<LeadDTO> {
    const clean: Record<string, unknown> = {};

    if (updates.status != null) {
      if (!VALID_STATUSES.includes(updates.status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`);
      }
      clean.status = updates.status;
      if (updates.status === "active" && !updates.posted_at) {
        clean.posted_at = new Date().toISOString();
      }
    }
    if (updates.price !== undefined) clean.price = updates.price;
    if (updates.notes !== undefined) clean.notes = updates.notes;
    if (updates.posted_at !== undefined) clean.posted_at = updates.posted_at;
    if (updates.expires_at !== undefined) clean.expires_at = updates.expires_at;
    if (updates.service_tags != null) clean.service_tags = updates.service_tags;

    if (Object.keys(clean).length === 0) {
      throw new ValidationError("No valid fields to update");
    }

    const { data, error } = await supabaseAdmin
      .from("leads")
      .update(clean)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") throw new NotFoundError("Lead", id);
      throw new InternalError(error.message);
    }

    return data as LeadDTO;
  }

  /** Delete a lead permanently. */
  async deleteLead(id: string): Promise<void> {
    await this.getLead(id); // verify existence

    const { error } = await supabaseAdmin
      .from("leads")
      .delete()
      .eq("id", id);

    if (error) throw new InternalError(error.message);
  }
}
